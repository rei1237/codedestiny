"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, clearClientAuthState } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { getAuthState, logout, refreshAuth } from "../_lib/auth-store";
import { persistSanitizedAuthUser, readSanitizedAuthUser } from "../_lib/auth-storage";
import WithdrawModal from "../components/WithdrawModal";

type AuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  hasLocalAuth?: boolean;
  role?: "user" | "admin";
  points?: number;
};

type DestinyProfile = {
  id: string;
  profileId?: string;
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
  createdAt?: string | null;
};

type ProfileSubscription = {
  tier: "free" | "standard" | "premium" | "vvip";
  isActive: boolean;
  profileLimit: number;
  expiresAt: string | null;
};

type ProfileStatePayload = {
  ok?: boolean;
  profiles?: DestinyProfile[];
  currentId?: string;
  canCreateMore?: boolean;
  subscription?: ProfileSubscription;
};

type PremiumPdfArchiveItem = {
  reportId: string;
  reportType: string;
  title?: string;
  displayName?: string;
  mode?: string;
  completedAt?: string;
  birthName?: string;
  targetName?: string;
  canReopen?: boolean;
  canDownload?: boolean;
  pdfUrl?: string;
};

function readCachedUser(): AuthUser | null {
  return readSanitizedAuthUser() as AuthUser | null;
}

function clearAuth() {
  clearClientAuthState();
}

function formatProfileBirth(profile: DestinyProfile) {
  const birth = profile.birth;
  const birthDateText = String((profile as DestinyProfile & { birthDate?: string; birthIso?: string }).birthDate || "").trim();
  const birthIsoText = String((profile as DestinyProfile & { birthDate?: string; birthIso?: string }).birthIso || "").trim();
  const birthTimeText = String((profile as DestinyProfile & { birthTime?: string }).birthTime || "").trim();

  if (birthDateText) {
    const normalizedDate = birthDateText.replace(/[./]/g, "-");
    const dateMatch = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const timeMatch = birthTimeText.match(/^(\d{2}):(\d{2})$/) || birthIsoText.match(/\s(\d{2}):(\d{2})$/);
      const hour = timeMatch ? timeMatch[1] : String(Number(birth?.hour || 0)).padStart(2, "0");
      const minute = timeMatch ? timeMatch[2] : String(Number(birth?.minute || 0)).padStart(2, "0");
      return `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]} ${hour}:${minute}`;
    }
  }

  if (!birth?.year || !birth.month || !birth.day) return "생년월일 미입력";
  const hour = String(Number(birth.hour || 0)).padStart(2, "0");
  const minute = String(Number(birth.minute || 0)).padStart(2, "0");
  return `${birth.year}.${String(birth.month).padStart(2, "0")}.${String(birth.day).padStart(2, "0")} ${hour}:${minute}`;
}

function planLabel(tier: ProfileSubscription["tier"]) {
  if (tier === "standard") return "스탠다드 달빛 이용권";
  if (tier === "premium") return "프리미엄 달빛 이용권";
  if (tier === "vvip") return "VVIP 달빛 이용권";
  return "이용권 없음";
}

function formatMonthlyStoneBalance(points?: number) {
  const value = Number(points || 0);
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return `${safeValue.toLocaleString("ko-KR")} 월정석 잔량`;
}

function fallbackSubscription(): ProfileSubscription {
  return {
    tier: "free",
    isActive: false,
    profileLimit: 1,
    expiresAt: null,
  };
}

function emitDestinyProfileChanged(profiles: DestinyProfile[], currentId: string) {
  const active = profiles.find((profile) => profile.id === currentId) || null;
  window.dispatchEvent(new CustomEvent("destinyProfileChanged", { detail: active }));
}

function formatArchiveDate(raw?: string) {
  if (!raw) return "날짜 정보 없음";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "날짜 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date).replace(/\./g, ".").replace(/\s/g, " ");
}

function modeLabel(mode?: string) {
  const token = String(mode || "").toLowerCase();
  if (token.includes("compat") || token.includes("couple")) return "궁합";
  if (token.includes("solo")) return "솔로";
  return "개인";
}

export default function MePage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const [profiles, setProfiles] = useState<DestinyProfile[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [subscription, setSubscription] = useState<ProfileSubscription>(fallbackSubscription());
  const [canCreateMore, setCanCreateMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [hasLocalAuth, setHasLocalAuth] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [busyAction, setBusyAction] = useState<string>("");
  const [archiveItems, setArchiveItems] = useState<PremiumPdfArchiveItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState("");

  const currentProfile = profiles.find((profile) => profile.id === currentId) || profiles[0] || null;
  const profileLimit = subscription.profileLimit > 0 ? subscription.profileLimit : 1;
  const slotPercent = Math.min(100, Math.round((profiles.length / profileLimit) * 100));
  const monthlyStoneBalance = formatMonthlyStoneBalance(user?.points);

  const applyProfilePayload = useCallback((payload: ProfileStatePayload | null) => {
    if (!payload || payload.ok !== true) return;

    const nextProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    const nextCurrentId = typeof payload.currentId === "string"
      ? payload.currentId
      : (nextProfiles[0]?.id || "");
    const nextSubscription = payload.subscription && typeof payload.subscription === "object"
      ? {
          tier: (payload.subscription.tier || "free") as ProfileSubscription["tier"],
          isActive: !!payload.subscription.isActive,
          profileLimit: Number(payload.subscription.profileLimit || 1),
          expiresAt: payload.subscription.expiresAt || null,
        }
      : fallbackSubscription();

    setProfiles(nextProfiles);
    setCurrentId(nextCurrentId);
    setSubscription(nextSubscription);
    setCanCreateMore(payload.canCreateMore !== false && nextProfiles.length < Math.max(1, nextSubscription.profileLimit));
    emitDestinyProfileChanged(nextProfiles, nextCurrentId);
  }, []);

  const loadProfileState = useCallback(async () => {
    const response = await authFetch(`${apiBase}/api/profile`, {
      method: "GET",
      cache: "no-store",
    }, {
      retryOn401: true,
      apiBase,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("auth_invalid");
      }
      throw new Error(String(payload?.message || "profile_state_failed"));
    }

    applyProfilePayload(payload);
  }, [apiBase, applyProfilePayload]);

  const loadPdfArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await authFetch(`${apiBase}/api/premium/pdf-archive`, {
        method: "GET",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setArchiveItems([]);
        setArchiveNotice(String(payload?.error?.message || payload?.message || "PDF 보관함을 불러오지 못했습니다."));
        return;
      }

      const items = Array.isArray(payload?.items) ? payload.items as PremiumPdfArchiveItem[] : [];
      setArchiveItems(items);
      setArchiveNotice("");

      try {
        const recent = items.slice(0, 30).map((item) => ({
          reportId: String(item?.reportId || ""),
          reportType: String(item?.reportType || ""),
          title: String(item?.title || ""),
          completedAt: String(item?.completedAt || ""),
        }));
        window.localStorage.setItem("codeDestinyPremiumPdfArchive", JSON.stringify(recent));
      } catch (_) {}
    } catch (_) {
      setArchiveItems([]);
      setArchiveNotice("PDF 보관함을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setArchiveLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const cachedUser = readCachedUser();
      if (mounted) {
        setUser(cachedUser);
        setHasLocalAuth(cachedUser?.hasLocalAuth !== false);
      }

      try {
        await refreshAuth({ force: false, silent: true });
        const authState = getAuthState();
        const nextUser = (authState.user || null) as AuthUser | null;

        if (!authState.isAuthenticated || !nextUser) {
          throw new Error("auth_invalid");
        }

        if (mounted) {
          persistSanitizedAuthUser(nextUser);
          setUser(nextUser);
          setHasLocalAuth(nextUser?.hasLocalAuth !== false);
          setAuthNotice("");
        }

        if (mounted) {
          await loadProfileState();
          await loadPdfArchive();
        }
      } catch (error) {
        if (!mounted) return;
        if (error instanceof Error && error.message === "auth_invalid") {
          clearAuth();
          router.replace("/login?next=%2Fme");
          return;
        }
        setAuthNotice("일시적인 네트워크 지연으로 계정 동기화가 늦어지고 있습니다. 잠시 후 다시 확인해 주세요.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [apiBase, loadPdfArchive, loadProfileState, router]);

  const activateProfile = async (profileId: string) => {
    setBusyAction(`activate:${profileId}`);
    try {
      const response = await authFetch(`${apiBase}/api/profile/current`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentId: profileId }),
      }, {
        retryOn401: true,
        apiBase,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setAuthNotice(String(payload?.message || "프로필 활성화에 실패했습니다."));
        return;
      }

      setCurrentId(profileId);
      emitDestinyProfileChanged(profiles, profileId);
      setAuthNotice("");
    } catch (e) {
      setAuthNotice("프로필 활성화 중 오류가 발생했습니다.");
    } finally {
      setBusyAction("");
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!window.confirm("이 프로필 카드를 삭제할까요?")) return;

    setBusyAction(`delete:${profileId}`);
    try {
      const response = await authFetch(`${apiBase}/api/profile/${encodeURIComponent(profileId)}`, {
        method: "DELETE",
      }, {
        retryOn401: true,
        apiBase,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setAuthNotice(String(payload?.message || "프로필 삭제에 실패했습니다."));
        return;
      }

      const nextProfiles = Array.isArray(payload?.profiles) ? payload.profiles as DestinyProfile[] : [];
      const nextCurrentId = typeof payload?.currentId === "string" ? payload.currentId : (nextProfiles[0]?.id || "");

      setProfiles(nextProfiles);
      setCurrentId(nextCurrentId);
      setCanCreateMore(nextProfiles.length < profileLimit);
      emitDestinyProfileChanged(nextProfiles, nextCurrentId);
      setAuthNotice("");
    } catch (e) {
      setAuthNotice("프로필 삭제 중 오류가 발생했습니다.");
    } finally {
      setBusyAction("");
    }
  };

  const handleAddProfileClick = () => {
    if (canCreateMore) {
      router.push("/#dpMasterCard");
      return;
    }
    setShowUpgradeModal(true);
  };

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await logout(apiBase);
    } finally {
      window.location.replace("/");
    }
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
              기기와 무관하게 동일한 계정의 프로필 카드가 서버에서 동기화됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/points" className="rounded-md border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">
              이용권 관리
            </Link>
            <button
              type="button"
              onClick={() => setIsWithdrawOpen(true)}
              className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200"
            >
              회원 탈퇴
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutPending}
              className="rounded-md border border-slate-500/50 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {logoutPending ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        </header>

        {authNotice ? (
          <div className="rounded-lg border border-amber-300/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {authNotice}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">계정</p>
            <p className="mt-1 truncate text-base font-semibold text-white">{user?.name || "사용자"}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{user?.email || "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">이벤트 월정석 잔량</p>
            <p className="mt-1 text-xl font-bold text-amber-200">{monthlyStoneBalance}</p>
            <p className="mt-2 text-xs text-slate-400">판매/충전 재화가 아닌 이벤트 지급 잔량입니다.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">프로필 슬롯</p>
            <p className="mt-1 text-xl font-bold text-white">{profiles.length}/{profileLimit}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-amber-300" style={{ width: `${slotPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{planLabel(subscription.tier)}</p>
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
              <button
                type="button"
                onClick={handleAddProfileClick}
                className={`rounded-md px-4 py-2 text-sm font-bold ${canCreateMore ? "bg-amber-300 text-slate-950" : "border border-amber-300/40 bg-amber-500/10 text-amber-100"}`}
              >
                프로필 카드 추가하기
              </button>
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
              {!canCreateMore ? (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="rounded-md border border-amber-300/35 px-3 py-2 text-xs font-semibold text-amber-100"
                >
                  슬롯 늘리기
                </button>
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
                  const activating = busyAction === `activate:${profile.id}`;
                  const deleting = busyAction === `delete:${profile.id}`;

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
                          onClick={() => void activateProfile(profile.id)}
                          disabled={active || activating || deleting || !!busyAction}
                          className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-45"
                        >
                          {activating ? "처리중..." : "사용"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteProfile(profile.id)}
                          disabled={deleting || activating || !!busyAction}
                          className="rounded-md border border-rose-300/25 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-35"
                        >
                          {deleting ? "삭제중..." : "삭제"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">PDF Archive</p>
              <h2 className="mt-1 text-xl font-bold text-white">나의 PDF 보관함</h2>
              <p className="mt-1 text-sm text-slate-300">이전에 생성한 프리미엄 PDF 리포트를 날짜별로 다시 확인할 수 있습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadPdfArchive()}
              className="rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200"
            >
              새로고침
            </button>
          </div>

          {archiveNotice ? (
            <div className="mt-4 rounded-lg border border-amber-300/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {archiveNotice}
            </div>
          ) : null}

          {archiveLoading ? (
            <div className="mt-4 rounded-lg border border-dashed border-white/20 p-4 text-sm text-slate-300">보관함을 불러오는 중입니다.</div>
          ) : archiveItems.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-white/20 p-4 text-sm text-slate-300">아직 생성한 PDF 리포트가 없습니다.</div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {archiveItems.map((item) => {
                const displayName = String(item.displayName || "프리미엄 리포트");
                const title = String(item.title || displayName);
                const subject = String(item.targetName || item.birthName || "").trim();
                return (
                  <article key={item.reportId} className="rounded-lg border border-white/10 bg-black/15 p-4">
                    <p className="text-xs font-semibold text-amber-200">{displayName}</p>
                    <h3 className="mt-1 text-base font-bold text-white">{title}</h3>
                    <p className="mt-2 text-xs text-slate-300">{formatArchiveDate(item.completedAt)} 생성 완료</p>
                    <p className="mt-1 text-xs text-slate-400">모드: {modeLabel(item.mode)}{subject ? ` · ${subject}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/me/reports?reportId=${encodeURIComponent(item.reportId)}`}
                        className="rounded-md bg-amber-300 px-3 py-1.5 text-xs font-bold text-slate-900"
                      >
                        다시 열람하기
                      </Link>
                      {item.canDownload && item.pdfUrl ? (
                        <a
                          href={item.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200"
                        >
                          PDF 다운로드
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-amber-300/35 bg-[#171a34] p-5 shadow-2xl shadow-black/40">
            <h3 className="text-lg font-bold text-amber-100">프로필 카드 한도에 도달했습니다</h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              달빛 이용권이 없는 계정은 프로필 카드를 1개까지만 생성할 수 있습니다. 여러 카드를 관리하려면 달빛 이용권을 등록해 주세요.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                닫기
              </button>
              <Link
                href="/points"
                className="rounded-md bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900"
                onClick={() => setShowUpgradeModal(false)}
              >
                이용권 등록하기
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        hasLocalAuth={hasLocalAuth}
      />
    </main>
  );
}
