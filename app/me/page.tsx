"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../_lib/api-config";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  points?: number;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
  joinedAt?: string | null;
};

type DestinyProfile = {
  id: string;
  name: string;
  gender?: "M" | "F" | "OTHER";
  birth?: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    calType?: string;
  };
  location?: {
    label?: string;
    tz?: string;
    lng?: number;
    lat?: number;
  };
  createdAt?: string;
};

type SubscriptionStatus = {
  tier: "free" | "standard" | "premium" | "vvip";
  isActive: boolean;
  expiresAt: string | null;
  profileLimit: number;
};

const PROFILE_NS = "FORTUNE_APP_USER_PROFILES";
const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";

function readToken() {
  try {
    return localStorage.getItem("fortune_auth_token") || "";
  } catch {
    return "";
  }
}

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function resolveScope(user: AuthUser | null) {
  const raw = user?.id || user?.email || "";
  return String(raw).trim().toLowerCase() || "guest";
}

function scopedListKey(scope: string) {
  return `${PROFILE_NS}.list::${scope}`;
}

function scopedCurrentKey(scope: string) {
  return `${PROFILE_NS}.current::${scope}`;
}

function readProfiles(scope: string) {
  try {
    const scoped = localStorage.getItem(scopedListKey(scope));
    const raw = scoped ?? localStorage.getItem(`${PROFILE_NS}.list`) ?? "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DestinyProfile[]) : [];
  } catch {
    return [];
  }
}

function readCurrentProfileId(scope: string) {
  try {
    return localStorage.getItem(scopedCurrentKey(scope)) || localStorage.getItem(`${PROFILE_NS}.current`) || "";
  } catch {
    return "";
  }
}

function writeProfiles(scope: string, profiles: DestinyProfile[], currentId: string) {
  localStorage.setItem(scopedListKey(scope), JSON.stringify(profiles));
  localStorage.setItem(`${PROFILE_NS}.list`, JSON.stringify(profiles));
  localStorage.setItem(`${PROFILE_NS}.scope`, scope);
  localStorage.setItem(`${PROFILE_NS}.legacyOwner`, scope);

  if (currentId) {
    localStorage.setItem(scopedCurrentKey(scope), currentId);
    localStorage.setItem(`${PROFILE_NS}.current`, currentId);
  } else {
    localStorage.removeItem(scopedCurrentKey(scope));
    localStorage.removeItem(`${PROFILE_NS}.current`);
  }

  window.dispatchEvent(new CustomEvent("destinyProfileChanged", {
    detail: profiles.find((profile) => profile.id === currentId) || null,
  }));
}

function clearAuth() {
  localStorage.removeItem("fortune_auth_token");
  localStorage.removeItem("fortune_auth_user");
  document.cookie = "fortune_auth_token=; path=/; max-age=0; samesite=lax";
  document.cookie = "fortune_auth_role=; path=/; max-age=0; samesite=lax";
}

function publishLogout() {
  try {
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage({ source: "me-page", event: "logout", at: Date.now() });
    channel.close();
  } catch {
    // no-op
  }
}

function formatProfileBirth(profile: DestinyProfile) {
  const birth = profile.birth;
  if (!birth?.year || !birth.month || !birth.day) return "생년월일 미입력";
  const hour = String(Number(birth.hour || 0)).padStart(2, "0");
  const minute = String(Number(birth.minute || 0)).padStart(2, "0");
  return `${birth.year}.${String(birth.month).padStart(2, "0")}.${String(birth.day).padStart(2, "0")} ${hour}:${minute}`;
}

function planLabel(tier: SubscriptionStatus["tier"]) {
  if (tier === "standard") return "스탠다드";
  if (tier === "premium") return "프리미엄";
  if (tier === "vvip") return "VVIP";
  return "무료";
}

export default function MePage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profiles, setProfiles] = useState<DestinyProfile[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    tier: "free",
    isActive: false,
    expiresAt: null,
    profileLimit: 1,
  });
  const [loading, setLoading] = useState(true);

  const scope = useMemo(() => resolveScope(user), [user]);
  const currentProfile = profiles.find((profile) => profile.id === currentId) || profiles[0] || null;
  const profileLimit = subscription.profileLimit > 0 ? subscription.profileLimit : 1;
  const slotPercent = Math.min(100, Math.round((profiles.length / profileLimit) * 100));

  const reloadProfiles = useCallback((nextUser: AuthUser | null) => {
    const nextScope = resolveScope(nextUser);
    const nextProfiles = readProfiles(nextScope);
    const nextCurrentId = readCurrentProfileId(nextScope) || nextProfiles[0]?.id || "";
    setProfiles(nextProfiles);
    setCurrentId(nextCurrentId);
  }, []);

  useEffect(() => {
    const savedToken = readToken();
    const cachedUser = readCachedUser();
    if (!savedToken) {
      router.replace("/login?next=%2Fme");
      return;
    }

    setToken(savedToken);
    setUser(cachedUser);
    reloadProfiles(cachedUser);

    fetch(`${apiBase}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) throw new Error("auth_invalid");
        return response.json();
      })
      .then((payload) => {
        if (!payload?.user) return;
        localStorage.setItem("fortune_auth_user", JSON.stringify(payload.user));
        setUser(payload.user);
        reloadProfiles(payload.user);
      })
      .catch((error) => {
        if (error instanceof Error && error.message === "auth_invalid") {
          clearAuth();
          router.replace("/login?next=%2Fme");
        }
      })
      .finally(() => setLoading(false));
  }, [apiBase, reloadProfiles, router]);

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/api/fortune/pig-coin/profile-subscription/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload) return;
        setSubscription({
          tier: payload.tier || "free",
          isActive: !!payload.isActive,
          expiresAt: payload.expiresAt || null,
          profileLimit: typeof payload.profileLimit === "number" ? payload.profileLimit : 1,
        });
      })
      .catch(() => {});
  }, [apiBase, token]);

  const activateProfile = (profileId: string) => {
    writeProfiles(scope, profiles, profileId);
    setCurrentId(profileId);
  };

  const deleteProfile = (profileId: string) => {
    if (profiles.length <= 1) return;
    if (!window.confirm("이 프로필 카드를 삭제할까요?")) return;
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    const nextCurrentId = currentId === profileId ? nextProfiles[0]?.id || "" : currentId;
    writeProfiles(scope, nextProfiles, nextCurrentId);
    setProfiles(nextProfiles);
    setCurrentId(nextCurrentId);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // local cleanup still follows
    }
    clearAuth();
    publishLogout();
    window.location.assign("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1224] px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl text-sm text-slate-300">내 프로필을 불러오는 중입니다.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1224] px-4 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">My Destiny</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">프로필 카드</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              운세 계산에 쓰이는 생년월일, 시간, 출생지를 한곳에서 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/points" className="rounded-md border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">
              구독 및 코인
            </Link>
            <button onClick={handleLogout} className="rounded-md border border-slate-500/50 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200">
              로그아웃
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">계정</p>
            <p className="mt-1 truncate text-base font-semibold text-white">{user?.name || "사용자"}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{user?.email || "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">보유 코인</p>
            <p className="mt-1 text-xl font-bold text-amber-200">{Number(user?.points || 0).toLocaleString("ko-KR")}P</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">프로필 슬롯</p>
            <p className="mt-1 text-xl font-bold text-white">{profiles.length}/{profileLimit}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-amber-300" style={{ width: `${slotPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{planLabel(subscription.tier)} 플랜</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-lg border border-amber-300/20 bg-[linear-gradient(145deg,rgba(25,28,58,0.98),rgba(42,30,70,0.96))] p-5 shadow-2xl shadow-black/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Active Card</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{currentProfile?.name || "아직 프로필이 없습니다"}</h2>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                현재 사용
              </span>
            </div>

            {currentProfile ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">생년월일시</p>
                  <p className="mt-1 font-semibold text-white">{formatProfileBirth(currentProfile)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">출생지</p>
                  <p className="mt-1 font-semibold text-white">{currentProfile.location?.label || "미입력"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">시간대</p>
                  <p className="mt-1 font-semibold text-white">{currentProfile.location?.tz || "Asia/Seoul"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">성별</p>
                  <p className="mt-1 font-semibold text-white">{currentProfile.gender === "M" ? "남성" : currentProfile.gender === "F" ? "여성" : "기타"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-lg border border-dashed border-amber-300/25 bg-black/15 p-5 text-sm text-slate-300">
                메인 화면에서 생년월일과 출생지를 입력한 뒤 프로필을 저장하면 이곳에 표시됩니다.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/#dpMasterCard" className="rounded-md bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950">
                메인에서 편집
              </Link>
              <Link href="/" className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">
                운세 보러가기
              </Link>
            </div>
          </article>

          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Profile List</p>
                <h2 className="mt-1 text-lg font-bold text-white">저장된 카드</h2>
              </div>
              {profiles.length >= profileLimit ? (
                <Link href="/points" className="rounded-md border border-amber-300/35 px-3 py-2 text-xs font-semibold text-amber-100">
                  슬롯 늘리기
                </Link>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {profiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-300">
                  저장된 프로필 카드가 없습니다.
                </div>
              ) : (
                profiles.map((profile) => {
                  const active = profile.id === currentId;
                  return (
                    <div key={profile.id} className={`rounded-lg border p-3 ${active ? "border-amber-300/45 bg-amber-300/10" : "border-white/10 bg-black/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{profile.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatProfileBirth(profile)}</p>
                        </div>
                        {active ? <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-slate-950">활성</span> : null}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => activateProfile(profile.id)}
                          disabled={active}
                          className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-45"
                        >
                          사용
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProfile(profile.id)}
                          disabled={profiles.length <= 1}
                          className="rounded-md border border-rose-300/25 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-35"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
