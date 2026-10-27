"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { isDestinyProfileStorageKey, normalizeDestinyProfileCard, readDestinyProfileAccountId, readScopedDestinyProfileList, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";

/** Read-only choices. Selecting a consultation subject must not replace the account's active profile. */
export function useSavedBirthProfiles() {
  const [profiles, setProfiles] = useState<DestinyProfileCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [owner, setOwner] = useState("");
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const account = readDestinyProfileAccountId();
    const request = ++revision.current;
    setOwner(account); setProfiles(readScopedDestinyProfileList()); setError(false);
    if (!account) { setProfiles([]); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await authFetch("/api/profile", { method: "GET", credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.profiles)) throw new Error("profiles-unavailable");
      if (request !== revision.current || account !== readDestinyProfileAccountId()) return;
      setProfiles(data.profiles.map((item: DestinyProfileCard) => normalizeDestinyProfileCard(item))
        .filter((item: DestinyProfileCard | null): item is DestinyProfileCard => Boolean(item && (item.id || item.profileId))));
    } catch {
      if (request === revision.current && account === readDestinyProfileAccountId()) setError(true);
    } finally { if (request === revision.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const sync = () => {
      revision.current++;
      const account = readDestinyProfileAccountId();
      setOwner(account); setProfiles(readScopedDestinyProfileList()); setError(false); setLoading(false);
      if (account) {
        // A current-profile fallback is not a complete list; fetch only when the scoped list is absent.
        const key = "FORTUNE_APP_USER_PROFILES.list::" + account;
        let cached = false;
        try { cached = Array.isArray(JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null")); } catch { /* fetch below */ }
        if (!cached) void reload();
      }
    };
    const authChanged = (event: Event) => {
      const detail=(event as CustomEvent).detail;
      if(detail?.event === "subscription" && ["subscription-sync","membership-cache"].includes(detail?.source))return;
      sync();
    };
    const storage = (event: StorageEvent) => { if (!event.key || event.key === "fortune_auth_user" || isDestinyProfileStorageKey(event.key)) sync(); };
    sync();
    window.addEventListener("cd:auth-changed", authChanged);
    window.addEventListener("storage", storage);
    document.addEventListener("destinyProfileChanged", sync);
    return () => { revision.current++; window.removeEventListener("cd:auth-changed", authChanged); window.removeEventListener("storage", storage); document.removeEventListener("destinyProfileChanged", sync); };
  }, [reload]);
  return { profiles, loading, error, owner, reload };
}
