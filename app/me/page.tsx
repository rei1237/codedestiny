"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  tier: "free" | "standard" | "premium" | "vvip" | "family";
  rawTier?: "free" | "standard" | "premium" | "vvip" | "family";
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

type ProfileActionType = "edit" | "delete";

type ProfileActionStage = "" | "pass" | "payment" | "coin" | "saving" | "deleting";

type ProfilePassSuccessNotice = {
  title: string;
  tierLabel: string;
} | null;

type ProfileActionDraft = {
  name: string;
  gender: "M" | "F" | "OTHER";
  birthDate: string;
  birthTime: string;
};

type PortOnePaymentResponse = {
  paymentId?: string;
  transactionType?: string;
  code?: string;
  message?: string;
  error_msg?: string;
  errorMsg?: string;
};

type PortOnePaymentConfig = {
  storeId: string;
  channelKey: string;
  noticeUrl?: string;
  currency?: string;
  payMethod?: string;
  message?: string;
};

type PortOnePaymentRequest = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: string;
  redirectUrl: string;
  customer: {
    customerId: string;
    fullName: string;
    phoneNumber?: string;
    email: string;
  };
  customData: Record<string, unknown>;
  noticeUrls?: string[];
};

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (request: PortOnePaymentRequest) => Promise<PortOnePaymentResponse>;
    };
  }
}

const PROFILE_CARD_ACTION_COST_COINS = 50;
const PROFILE_CARD_ACTION_COST_KRW = 5000;
const PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST = PROFILE_CARD_ACTION_COST_COINS * 10;
const PROFILE_CARD_ACTION_FEATURE_KEY = "profile-card-manage";
const PROFILE_CARD_ACTION_SERVICE_TYPE = "profile_card_action";

async function safeParseJson<T>(response: Response): Promise<T & { message?: string; ok?: boolean }> {
  try {
    return await response.json();
  } catch (_) {
    return {} as T & { message?: string; ok?: boolean };
  }
}

function profileActionLabel(action: ProfileActionType) {
  return action === "edit" ? "\uC218\uC815" : "\uC0AD\uC81C";
}

function profileActionProductName(action: ProfileActionType) {
  return `\uD504\uB85C\uD544 \uCE74\uB4DC ${profileActionLabel(action)}`;
}

function profileActionButtonLabel(action: ProfileActionType, freeLabel: string, coinBalance: number) {
  const label = profileActionLabel(action);
  if (freeLabel === "VVIP") return `VVIP 무료 ${profileActionLabel(action)}`;
  if (freeLabel) return `${freeLabel} 무료 ${profileActionLabel(action)}`;
  if (coinBalance >= PROFILE_CARD_ACTION_COST_COINS) return `${label} · ${PROFILE_CARD_ACTION_COST_COINS}\uCF54\uC778`;
  return `${label} · ${PROFILE_CARD_ACTION_COST_KRW.toLocaleString("ko-KR")}\uC6D0`;
}

function profileActionPrimaryLabel(action: ProfileActionType, freeLabel: string, coinBalance: number) {
  if (freeLabel === "VVIP") return `VVIP 무료 ${profileActionLabel(action)}`;
  if (freeLabel) return `${freeLabel} 무료 ${profileActionLabel(action)}`;
  if (coinBalance >= PROFILE_CARD_ACTION_COST_COINS) return `${PROFILE_CARD_ACTION_COST_COINS}\uCF54\uC778 \uC0AC\uC6A9`;
  return `${PROFILE_CARD_ACTION_COST_KRW.toLocaleString("ko-KR")}\uC6D0 \uACB0\uC81C`;
}

function profileActionProgressLabel(action: ProfileActionType, stage: ProfileActionStage) {
  if (stage === "pass") return "\uC774\uC6A9\uAD8C\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.";
  if (stage === "payment") return "결제창을 여는 중입니다.";
  if (stage === "coin") return "코인을 차감하는 중입니다.";
  if (stage === "saving") return "\uC218\uC815 \uB0B4\uC6A9\uC744 \uC800\uC7A5\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.";
  if (stage === "deleting") return "\uD504\uB85C\uD544 \uCE74\uB4DC\uB97C \uC0AD\uC81C\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.";
  return action === "edit" ? "\uC218\uC815 \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4." : "\uC0AD\uC81C \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4.";
}


function buildProfileActionRequestId(action: ProfileActionType, profileId: string) {
  return `profile-card:${action}:${profileId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`.slice(0, 120);
}

function getProfileBirthDate(profile: DestinyProfile) {
  const anyProfile = profile as DestinyProfile & { birthDate?: string; birthIso?: string };
  const direct = String(anyProfile.birthDate || "").trim();
  if (direct) return direct.slice(0, 10);
  const iso = String(anyProfile.birthIso || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const birth = profile.birth || {};
  if (!birth.year || !birth.month || !birth.day) return "";
  return `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`;
}

function getProfileBirthTime(profile: DestinyProfile) {
  const anyProfile = profile as DestinyProfile & { birthTime?: string; birthIso?: string };
  const direct = String(anyProfile.birthTime || "").trim();
  if (/^\d{2}:\d{2}$/.test(direct)) return direct;
  const iso = String(anyProfile.birthIso || "").trim();
  const match = iso.match(/\s(\d{2}:\d{2})/);
  if (match) return match[1];
  const birth = profile.birth || {};
  return `${String(Number(birth.hour || 0)).padStart(2, "0")}:${String(Number(birth.minute || 0)).padStart(2, "0")}`;
}

function buildEditDraft(profile: DestinyProfile): ProfileActionDraft {
  return {
    name: String(profile.name || "").trim(),
    gender: profile.gender || "OTHER",
    birthDate: getProfileBirthDate(profile),
    birthTime: getProfileBirthTime(profile),
  };
}

function buildPortOneCustomer(user: AuthUser | null, paymentId: string) {
  const merged = { ...((readSanitizedAuthUser() as AuthUser | null) || {}), ...(user || {}) } as AuthUser;
  const email = String(merged.email || "").trim();
  if (!/^[^@\s]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("??棺堉?뤃?????????????????μ떜媛?걫?筌뚮챶夷???轅붽틓??????????????⑹름??????뭽??");
  }
  return {
    customerId: String(merged.id || merged.userId || merged.uid || merged._id || paymentId).trim(),
    fullName: String(merged.name || "\uACE0\uAC1D").trim(),
    email,
  };
}

function mapPaymentErrorMessage(message?: string) {
  const text = String(message || "").trim();
  return text || "??棺堉?뤃???傭?끆??????? ?????諛몃마???? ?????繹먮굝???????";
}

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

  if (!birth?.year || !birth.month || !birth.day) return "\uC0DD\uB144\uC6D4\uC77C \uC815\uBCF4 \uC5C6\uC74C";
  const hour = String(Number(birth.hour || 0)).padStart(2, "0");
  const minute = String(Number(birth.minute || 0)).padStart(2, "0");
  return `${birth.year}.${String(birth.month).padStart(2, "0")}.${String(birth.day).padStart(2, "0")} ${hour}:${minute}`;
}

function planLabel(tier: ProfileSubscription["tier"]) {
  if (tier === "standard") return "\uC2A4\uD0E0\uB2E4\uB4DC \uC774\uC6A9\uAD8C";
  if (tier === "premium") return "\uD504\uB9AC\uBBF8\uC5C4 \uC774\uC6A9\uAD8C";
  if (tier === "vvip") return "VVIP \uC774\uC6A9\uAD8C";
  if (tier === "family") return "Code Destiny Family";
  return "\uBB34\uB8CC \uACC4\uC815";
}

function formatMonthlyStoneBalance(monthlyCredits?: number) {
  const value = Number(monthlyCredits || 0);
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return `${safeValue.toLocaleString("ko-KR")} ??? ??`;
}

function fallbackSubscription(): ProfileSubscription {
  return {
    tier: "free",
    rawTier: "free",
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
  if (!raw) return "?? ?? ??";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "?? ?? ??";
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
  if (token.includes("compat") || token.includes("couple")) return "????嚥싲갭횧???";
  if (token.includes("solo")) return "??";
  return "??";
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
  const [membershipCreditBalance, setMembershipCreditBalance] = useState(0);
  const [editTarget, setEditTarget] = useState<DestinyProfile | null>(null);
  const [editDraft, setEditDraft] = useState<ProfileActionDraft>({
    name: "",
    gender: "OTHER",
    birthDate: "",
    birthTime: "00:00",
  });
  const [deleteTarget, setDeleteTarget] = useState<DestinyProfile | null>(null);
  const [profileActionStage, setProfileActionStage] = useState<ProfileActionStage>("");
  const [profilePassSuccessNotice, setProfilePassSuccessNotice] = useState<ProfilePassSuccessNotice>(null);
  const [activeProfileMenuId, setActiveProfileMenuId] = useState("");
  const activeProfileMenuRef = useRef<HTMLDivElement | null>(null);
  const activeProfileCardRef = useRef<HTMLElement | null>(null);

  const currentProfile = profiles.find((profile) => profile.id === currentId) || profiles[0] || null;
  const isUnlimitedProfilePlan = subscription.isActive && subscription.profileLimit === 0;
  const profileLimit = isUnlimitedProfilePlan ? Math.max(profiles.length, 1) : (subscription.profileLimit > 0 ? subscription.profileLimit : 1);
  const profileLimitLabel = isUnlimitedProfilePlan ? "∞" : String(profileLimit);
  const slotPercent = isUnlimitedProfilePlan ? 100 : Math.min(100, Math.round((profiles.length / profileLimit) * 100));
  const monthlyStoneBalance = formatMonthlyStoneBalance(membershipCreditBalance);
  const profileActionCoinBalance = Math.max(0, Math.floor(Number(membershipCreditBalance || 0) / 10));
  const profileActionFreeLabel = subscription.isActive && subscription.tier === "family"
    ? "Family"
    : (subscription.isActive && subscription.tier === "vvip" && profiles.length <= profileLimit ? "VVIP" : "");
  const isVvipProfileActionFree = Boolean(profileActionFreeLabel);
  const hasStoredVvipPass = subscription.rawTier === "vvip" || subscription.tier === "vvip" || subscription.rawTier === "family" || subscription.tier === "family";
  const isExpiredVvipProfileAction = hasStoredVvipPass && !subscription.isActive;
  const isVvipProfileLimitExceeded = subscription.isActive && subscription.tier === "vvip" && profiles.length > profileLimit;
  const profileActionPolicyNotice = profileActionFreeLabel === "VVIP"
    ? "VVIP 혜택 적용 중 · 한도 내 무료 관리"
    : profileActionFreeLabel
      ? `${profileActionFreeLabel} 무료 관리 적용 중`
    : isExpiredVvipProfileAction
      ? "이용권이 만료되어 50코인이 필요합니다."
      : isVvipProfileLimitExceeded
        ? "VVIP 프로필 한도를 초과해 50코인이 필요합니다."
        : "프로필 카드 추가·수정·삭제는 1회 50코인이 필요합니다.";

  useEffect(() => {
    if (!activeProfileMenuId) return;
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && activeProfileMenuRef.current?.contains(target)) return;
      setActiveProfileMenuId("");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProfileMenuId("");
    };
    document.addEventListener("pointerdown", closeFromOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeProfileMenuId]);

  const applyProfilePayload = useCallback((payload: ProfileStatePayload | null) => {
    if (!payload || payload.ok !== true) return;

    const nextProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    const nextCurrentId = typeof payload.currentId === "string"
      ? payload.currentId
      : (nextProfiles[0]?.id || "");
    const nextSubscription = payload.subscription && typeof payload.subscription === "object"
        ? {
            tier: (payload.subscription.tier || "free") as ProfileSubscription["tier"],
            rawTier: (payload.subscription.rawTier || payload.subscription.tier || "free") as ProfileSubscription["rawTier"],
            isActive: !!payload.subscription.isActive,
            profileLimit: Number.isFinite(Number(payload.subscription.profileLimit)) ? Math.max(0, Math.floor(Number(payload.subscription.profileLimit))) : 1,
            expiresAt: payload.subscription.expiresAt || null,
        }
      : fallbackSubscription();

    setProfiles(nextProfiles);
    setCurrentId(nextCurrentId);
    setSubscription(nextSubscription);
    setCanCreateMore(payload.canCreateMore !== false);
    emitDestinyProfileChanged(nextProfiles, nextCurrentId);
  }, []);

  const refreshProfileActionBalance = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/billing/balance`, {
        method: "GET",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      const payload = await safeParseJson<{
        data?: {
          monthlyCredits?: number;
          membershipCreditBalance?: number;
          membership?: { membershipCreditBalance?: number };
          legacyCoinBalance?: number;
          balance?: number;
        };
        user?: { points?: number };
      }>(response);
      const data = payload.data || {};
      const credit = Number(data.monthlyCredits ?? data.membershipCreditBalance ?? data.membership?.membershipCreditBalance ?? 0);
      setMembershipCreditBalance(Number.isFinite(credit) ? Math.max(0, Math.floor(credit)) : 0);
      const nextPoints = Number(data.legacyCoinBalance ?? data.balance ?? payload.user?.points ?? user?.points ?? 0);
      if (Number.isFinite(nextPoints)) {
        setUser((prev) => prev ? { ...prev, points: Math.max(0, Math.floor(nextPoints)) } : prev);
      }
    } catch (_) {
      setMembershipCreditBalance(0);
    }
  }, [apiBase, user?.points]);

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
        setArchiveNotice(String(payload?.error?.message || payload?.message || "PDF ????쇰뮛????????얜끍??????⑥ル럯????? ?饔낅떽???壤??얜?裕?傭??????"));
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
      setArchiveNotice("PDF ????쇰뮛????????얜끍??????⑥ル럯??????嶺뚮ㅎ???????????ㅼ굣?????ル늉?? ????썹땟戮녹??醫딆맚嶺뚮㉡???????????????놁졄.");
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
          await refreshProfileActionBalance();
          await loadPdfArchive();
        }
      } catch (error) {
        if (!mounted) return;
        if (error instanceof Error && error.message === "auth_invalid") {
          clearAuth();
          router.replace("/login?next=%2Fme");
          return;
        }
        setAuthNotice("???μ떜媛?걫??곷묄壤??????ㅻ쑋????????源낅젾??????곕츧???饔낅떽???????????????鶯ㅺ동????????????????? ??????饔끸뫅????????????????놁졄. ??????酉귘뵾?????????살퓢????轅붽틓??????????????⑹름??????뭽??");
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
  }, [apiBase, loadPdfArchive, loadProfileState, refreshProfileActionBalance, router]);

  const ensurePortoneSdk = useCallback(() => new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("????????щⅨ???? ??????鈺????鶯ㅺ동????ル쭔???棺堉?뤃???傭?끆???嶺뚮?猷볠꽴??饔낅떽?????嶺뚮ㅎ??????????????????놁졄."));
      return;
    }
    if (window.PortOne?.requestPayment) {
      resolve();
      return;
    }
    const scriptId = "portone-v2-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.PortOne?.requestPayment) resolve();
        else reject(new Error("?????V2 SDK????ル늉?? ??????멸괜?????嫄????룸Ŧ爾????源녾텛? ?????繹먮굝???????"));
      }, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("??棺堉?뤃????SDK??????⑥ル럯????? ?饔낅떽???壤??얜?裕?傭??????")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.PortOne?.requestPayment) resolve();
      else reject(new Error("?????V2 SDK????ル늉?? ??????멸괜?????嫄????룸Ŧ爾????源녾텛? ?????繹먮굝???????"));
    };
    script.onerror = () => reject(new Error("??棺堉?뤃????SDK??????⑥ル럯????? ?饔낅떽???壤??얜?裕?傭??????"));
    document.body.appendChild(script);
  }), []);

  const fetchPortOnePaymentConfig = useCallback(async (): Promise<PortOnePaymentConfig> => {
    const response = await authFetch(`${apiBase}/api/payments/config`, {
      method: "GET",
      credentials: "include",
    }, {
      retryOn401: true,
      apiBase,
    });
    const payload = await safeParseJson<PortOnePaymentConfig>(response);
    if (!response.ok || !payload.storeId || !payload.channelKey) {
      throw new Error(payload.message || "?????V2 ??棺堉?뤃???????嚥싲갭큔??????轅붽틓?????????????????깅즽????????놁졄.");
    }
    return {
      storeId: String(payload.storeId || "").trim(),
      channelKey: String(payload.channelKey || "").trim(),
      noticeUrl: payload.noticeUrl,
      currency: payload.currency || "CURRENCY_KRW",
      payMethod: payload.payMethod || "CARD",
    };
  }, [apiBase]);

  const runProfileActionCardPayment = useCallback(async (action: ProfileActionType, profile: DestinyProfile, requestId: string) => {
    const productName = profileActionProductName(action);
    const productId = `profile-card-action-${action}`;
    const prepareResponse = await authFetch(`${apiBase}/api/payments/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        paymentType: "digital_content",
        productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        productId,
        featureKey: PROFILE_CARD_ACTION_FEATURE_KEY,
        reason: productName,
        productName,
        paymentAmount: PROFILE_CARD_ACTION_COST_KRW,
        coinPrice: PROFILE_CARD_ACTION_COST_COINS,
        membershipCreditCost: PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST,
        actionType: action,
        profileCardId: profile.id,
        profileId: profile.id,
        selectedProfileId: profile.id,
        userId: user?.id || user?.userId || user?._id || user?.uid,
        requestId,
        idempotencyKey: requestId,
        orderId: requestId,
        paymentMethod: "card",
      }),
    }, {
      retryOn401: true,
      apiBase,
    });

    const preparePayload = await safeParseJson<{
      order?: {
        merchantUid: string;
        paymentAmount: number;
        coinPrice?: number;
        productName?: string;
      };
    }>(prepareResponse);
    const order = preparePayload.order;
    if (!prepareResponse.ok || !order?.merchantUid) {
      throw new Error(preparePayload.message || "??棺堉?뤃?????關???꾨き?筌욌끀??鍮㎳??????곗뒧????????⑤슣?????????????놁졄.");
    }

    await ensurePortoneSdk();
    if (!window.PortOne?.requestPayment) throw new Error("?????V2 ??棺堉?뤃????SDK????ル늉?? ??????멸괜?????嫄????룸Ŧ爾????源녾텛? ?????繹먮굝???????");

    const paymentConfig = await fetchPortOnePaymentConfig();
    const redirectUrl = new URL("/me", window.location.origin);
    redirectUrl.searchParams.set("portone_redirect", "1");

    const paymentRequest: PortOnePaymentRequest = {
      storeId: paymentConfig.storeId,
      channelKey: paymentConfig.channelKey,
      paymentId: order.merchantUid,
      orderName: order.productName || productName,
      totalAmount: Number(order.paymentAmount || PROFILE_CARD_ACTION_COST_KRW),
      currency: paymentConfig.currency || "CURRENCY_KRW",
      payMethod: paymentConfig.payMethod || "CARD",
      redirectUrl: redirectUrl.toString(),
      customer: buildPortOneCustomer(user, order.merchantUid),
      customData: {
        productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        actionType: action,
        profileCardId: profile.id,
        profileId: profile.id,
        costCoins: PROFILE_CARD_ACTION_COST_COINS,
        amountKrw: PROFILE_CARD_ACTION_COST_KRW,
        requestId,
        idempotencyKey: requestId,
        userId: user?.id || user?.userId || user?._id || user?.uid,
      },
    };
    if (paymentConfig.noticeUrl) paymentRequest.noticeUrls = [paymentConfig.noticeUrl];

    const rsp = await window.PortOne.requestPayment(paymentRequest);
    const paymentId = String(rsp?.paymentId || order.merchantUid || "").trim();
    if (!rsp || rsp.code || !paymentId) {
      throw new Error(mapPaymentErrorMessage(rsp?.message || rsp?.error_msg || rsp?.errorMsg));
    }

    const confirmResponse = await authFetch(`${apiBase}/api/payments/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        impUid: paymentId,
        merchantUid: order.merchantUid,
        paymentAmount: Number(order.paymentAmount || PROFILE_CARD_ACTION_COST_KRW),
        chargePoints: Number(order.coinPrice || PROFILE_CARD_ACTION_COST_COINS),
        paymentType: "digital_content",
        productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        productId,
        featureKey: PROFILE_CARD_ACTION_FEATURE_KEY,
        productName,
        actionType: action,
        profileCardId: profile.id,
        profileId: profile.id,
        selectedProfileId: profile.id,
        requestId,
        idempotencyKey: requestId,
        orderId: requestId,
        paymentMethod: "card",
      }),
    }, {
      retryOn401: true,
      apiBase,
    });
    const confirmPayload = await safeParseJson<{ accessGrant?: Record<string, unknown>; payment?: Record<string, unknown> }>(confirmResponse);
    if (!confirmResponse.ok) throw new Error(confirmPayload.message || "???꿔꺂??틝???彛???棺堉?뤃??????棺堉?뤃???饔낅떽??影?곗몡???紐????レ몘???????⑤슣?????????????놁졄.");
    return {
      accessGrant: confirmPayload.accessGrant || null,
      payment: confirmPayload.payment || null,
      merchantUid: order.merchantUid,
      paymentId,
    };
  }, [apiBase, ensurePortoneSdk, fetchPortOnePaymentConfig, user]);

  const runProfileActionPassGate = useCallback(async (action: ProfileActionType, profile: DestinyProfile, requestId: string) => {
    const productName = profileActionProductName(action);
    const serviceKey = `profile_card_${action}`;
    const response = await authFetch(`${apiBase}/api/billing/coin-gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        cost: PROFILE_CARD_ACTION_COST_COINS,
        coinPrice: PROFILE_CARD_ACTION_COST_COINS,
        reason: productName,
        featureKey: PROFILE_CARD_ACTION_FEATURE_KEY,
        paymentMode: "MEMBERSHIP_PASS",
        forceDeduct: true,
        requestId,
        productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceKey,
        reportType: serviceKey,
        actionType: action,
        profileAction: action,
        action,
        profileCardId: profile.id,
        profileId: profile.id,
        selectedProfileId: profile.id,
      }),
    }, {
      retryOn401: true,
      apiBase,
    });
    const raw = await safeParseJson<Record<string, unknown>>(response);
    const data = raw && typeof raw.data === "object" && raw.data !== null ? raw.data as Record<string, unknown> : raw;
    const error = raw && typeof raw.error === "object" && raw.error !== null ? raw.error as Record<string, unknown> : {};
    const status = String(raw.status || data.status || "").trim().toLowerCase();
    const code = String(raw.reason || raw.code || data.reason || data.code || error.code || "").trim().toUpperCase();
    const accessGrant = data.accessGrant && typeof data.accessGrant === "object" ? data.accessGrant as Record<string, unknown> : undefined;
    const consume = data.consume && typeof data.consume === "object" ? data.consume as Record<string, unknown> : undefined;
    const payment = data.payment && typeof data.payment === "object" ? data.payment as Record<string, unknown> : undefined;
    const accessType = String(data.accessType || data.transactionType || data.accessMethod || accessGrant?.accessType || accessGrant?.transactionType || "").trim().toLowerCase();
    const alreadyUnlocked = data.alreadyUnlocked === true || status === "already_unlocked" || accessType === "already_unlocked";
    const passApplied = status === "pass_applied" || data.freeBySubscription === true || accessType === "membership_pass" || accessType === "pass";
    if (response.ok && (alreadyUnlocked || passApplied)) {
      const transactionId = String(data.transactionId || data.paymentId || data.purchaseId || data.requestId || requestId);
      return {
        status: alreadyUnlocked ? "already_unlocked" : "pass_applied",
        paymentContext: {
          accessGrant,
          consume,
          payment,
          transactionId,
          _paymentContext: {
            requestId,
            transactionId,
            featureKey: PROFILE_CARD_ACTION_FEATURE_KEY,
            profileId: profile.id,
            actionType: serviceKey,
            profileAction: action,
          },
        },
      };
    }
    if (response.status === 402 || status === "payment_required" || code === "PAYMENT_REQUIRED" || code === "MEMBERSHIP_PASS_NOT_COVERED" || code === "PRICE_EXCEEDS_PASS_LIMIT" || code === "PROFILE_LIMIT_EXCEEDED") return null;
    if (response.status === 401 || response.status === 403 || code === "AUTH_REQUIRED") throw new Error("?癲??嶺???轅붽틓?????됱깢???????諛몃마????꿔꺂??????");
    throw new Error(String(raw.message || data.message || error.message || "??????⑤뜤?誘⑸쿋?????轅붽틓???????????????⑤슣?????????????놁졄."));
  }, [apiBase]);

  const activateProfile = async (profileId: string) => {
    setActiveProfileMenuId("");
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
        setAuthNotice(String(payload?.message || "?????諛몃마??λ?????????????嫄?????????⑤슣?????????????놁졄."));
        return;
      }

      setCurrentId(profileId);
      emitDestinyProfileChanged(profiles, profileId);
      setAuthNotice("");
    } catch (e) {
      setAuthNotice("?????諛몃마??λ???????????????????ㅼ굣?????ル늉?? ????썹땟戮녹??醫딆맚嶺뚮㉡???????????????놁졄.");
    } finally {
      setBusyAction("");
    }
  };

  const viewProfile = async (profile: DestinyProfile) => {
    setActiveProfileMenuId("");
    if (profile.id !== currentId) {
      await activateProfile(profile.id);
    }
    window.requestAnimationFrame(() => {
      activeProfileCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const executeProfileAction = useCallback(async (
    action: ProfileActionType,
    profile: DestinyProfile,
    requestId: string,
    paymentContext: Record<string, unknown> | null,
    draft?: ProfileActionDraft,
  ) => {
    const body: Record<string, unknown> = {
      requestId,
      productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
      serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
      actionType: action,
      profileCardId: profile.id,
      profileId: profile.id,
      selectedProfileId: profile.id,
      costCoins: PROFILE_CARD_ACTION_COST_COINS,
      amountKrw: PROFILE_CARD_ACTION_COST_KRW,
      ...(paymentContext || {}),
    };
    if (action === "edit" && draft) {
      body.name = draft.name;
      body.gender = draft.gender;
      body.birthDate = draft.birthDate;
      body.birthTime = draft.birthTime;
    }

    const response = await authFetch(`${apiBase}/api/profile/${encodeURIComponent(profile.id)}`, {
      method: action === "edit" ? "PATCH" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, {
      retryOn401: true,
      apiBase,
    });
    const payload = await safeParseJson<{ profiles?: DestinyProfile[]; currentId?: string; profile?: DestinyProfile }>(response);
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || `${profileActionProductName(action)}????????⑤슣?????????????놁졄.`);

    if (action === "delete") {
      const nextProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
      const nextCurrentId = typeof payload.currentId === "string" ? payload.currentId : (nextProfiles[0]?.id || "");
      setProfiles(nextProfiles);
      setCurrentId(nextCurrentId);
      setCanCreateMore(true);
      emitDestinyProfileChanged(nextProfiles, nextCurrentId);
    } else if (payload.profile) {
      const nextProfiles = profiles.map((item) => item.id === profile.id ? payload.profile as DestinyProfile : item);
      setProfiles(nextProfiles);
      if (profile.id === currentId) emitDestinyProfileChanged(nextProfiles, currentId);
    }
    await refreshProfileActionBalance();
  }, [apiBase, currentId, profiles, refreshProfileActionBalance]);

  const runProfileActionFlow = useCallback(async (action: ProfileActionType, profile: DestinyProfile, draft?: ProfileActionDraft) => {
    const label = profileActionLabel(action);
    const requestId = buildProfileActionRequestId(action, profile.id);
    const hasCoinBalance = profileActionCoinBalance >= PROFILE_CARD_ACTION_COST_COINS;
    setBusyAction(`${action}:${profile.id}`);
    try {
      let paymentContext: Record<string, unknown> | null = null;
      let passApplied = false;
      setProfileActionStage("pass");
      const passAccess = await runProfileActionPassGate(action, profile, requestId);
      if (passAccess?.paymentContext) {
        paymentContext = passAccess.paymentContext;
        passApplied = passAccess.status === "pass_applied";
        if (passApplied) {
          setProfilePassSuccessNotice({
            title: profileActionProductName(action),
            tierLabel: subscription.tier === "family" ? "Family" : (subscription.tier === "vvip" ? "VVIP" : (subscription.tier === "premium" ? "\uD504\uB9AC\uBBF8\uC5C4" : "\uC2A4\uD0E0\uB2E4\uB4DC")),
          });
        }
      }
      if (!paymentContext && !isVvipProfileActionFree && !hasCoinBalance) {
        setProfileActionStage("payment");
        const payment = await runProfileActionCardPayment(action, profile, requestId);
        paymentContext = {
          accessGrant: payment.accessGrant || undefined,
          payment: payment.payment || undefined,
          merchantUid: payment.merchantUid,
          paymentId: payment.paymentId,
        };
      } else if (!paymentContext && !isVvipProfileActionFree) {
        setProfileActionStage("coin");
      }
      if (isVvipProfileActionFree || paymentContext) {
        setProfileActionStage(action === "edit" ? "saving" : "deleting");
      }
      await executeProfileAction(action, profile, requestId, paymentContext, draft);
      setAuthNotice(passApplied
        ? `${profileActionProductName(action)}\uC774 \uC774\uC6A9\uAD8C\uC73C\uB85C \uCC98\uB9AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`
        : (isVvipProfileActionFree
          ? `VVIP \uC774\uC6A9\uAD8C\uC73C\uB85C \uBB34\uB8CC ${label} \uC644\uB8CC`
          : `${profileActionProductName(action)}\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`));
      if (action === "edit") setEditTarget(null);
      if (action === "delete") setDeleteTarget(null);
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : `${profileActionProductName(action)} \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.`);
    } finally {
      setBusyAction("");
      setProfileActionStage("");
    }
  }, [executeProfileAction, isVvipProfileActionFree, profileActionCoinBalance, runProfileActionCardPayment, runProfileActionPassGate, subscription.tier]);

  const openEditProfile = (profile: DestinyProfile) => {
    setActiveProfileMenuId("");
    setEditTarget(profile);
    setEditDraft(buildEditDraft(profile));
    setAuthNotice("");
  };

  const deleteProfile = async (profileId: string) => {
    setActiveProfileMenuId("");
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      setAuthNotice("??????????諛몃마??λ????????노듋?????壤굿?쒓낯???饔낅떽???????????????깅즽????????놁졄.");
      return;
    }
    setDeleteTarget(profile);
    setAuthNotice("");
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
        <div className="mx-auto max-w-5xl text-sm text-slate-300">{"\uB0B4 \uC6B4\uBA85 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1224] px-4 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">My Destiny</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{"\uB9C8\uC774 \uD398\uC774\uC9C0"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {"\uD504\uB85C\uD544 \uCE74\uB4DC\uC640 \uC774\uC6A9\uAD8C, \uACB0\uC81C \uB0B4\uC5ED\uC744 \uD655\uC778\uD569\uB2C8\uB2E4."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/points" className="rounded-md border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">
              {"\uC774\uC6A9\uAD8C \uAD00\uB9AC"}</Link>
            <button
              type="button"
              onClick={() => setIsWithdrawOpen(true)}
              className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200"
            >
              {"\uD68C\uC6D0 \uD0C8\uD1F4"}
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutPending}
              className="rounded-md border border-slate-500/50 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {logoutPending ? "\uB85C\uADF8\uC544\uC6C3 \uC911..." : "\uB85C\uADF8\uC544\uC6C3"}
            </button>
          </div>
        </header>

        {authNotice ? (
          <div className="rounded-lg border border-amber-300/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {authNotice}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">??? ??</p>
            <p className="mt-1 text-xl font-bold text-white">{profiles.length}/{profileLimitLabel}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-amber-300" style={{ width: `${slotPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{planLabel(subscription.tier)}</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article ref={activeProfileCardRef} className="rounded-lg border border-amber-300/20 bg-[linear-gradient(145deg,rgba(25,28,58,0.98),rgba(42,30,70,0.96))] p-5 shadow-2xl shadow-black/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Active Card</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{currentProfile?.name || "?????諛몃마??蹂㏓룾??????諛몃마??λ???????諛몃마??維◈???????깅즽????????놁졄"}</h2>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                ?????諛몃마??????
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-sky-200/20 bg-[linear-gradient(135deg,rgba(7,17,38,0.96),rgba(34,56,99,0.9)_48%,rgba(44,27,75,0.96))] p-4 shadow-[0_10px_34px_rgba(0,0,0,0.44),0_0_24px_rgba(56,189,248,0.14)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-sky-100/70 bg-[linear-gradient(145deg,#f8fafc_0%,#bae6fd_34%,#8b5cf6_74%,#172554_100%)] shadow-[0_0_18px_rgba(56,189,248,0.35),0_0_10px_rgba(196,181,253,0.22),inset_0_2px_6px_rgba(255,255,255,0.45)]">
                    <span className="absolute inset-2 rounded-xl border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.62),rgba(255,255,255,0.08))]" />
                    <span className="absolute left-[30%] top-[30%] h-1.5 w-1.5 rounded-full bg-[#fef3c7]" />
                    <span className="absolute left-[53%] top-[56%] h-1.5 w-1.5 rounded-full bg-[#e0f2fe] shadow-[8px_8px_0_rgba(224,242,254,0.88)]" />
                    <span className="absolute right-[26%] top-[20%] h-1 w-1 rounded-full bg-[#ddd6fe]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">??? ??</p>
                    <p className="mt-0.5 text-xl font-black tracking-tight text-amber-100">{monthlyStoneBalance}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">???????饔낅떽??????????嫄???? ?????諛몃마??λ????????노듋????? ??傭?끆?????ル벥???????곸궔?????녾컯?遺븐땡??????</p>
                  </div>
                </div>
                <Link href="/points" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,0.34)] transition-transform hover:-translate-y-0.5">{"\uC774\uC6A9\uAD8C \uAD00\uB9AC"}</Link>
              </div>
            </div>
            {currentProfile ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">????</p>
                  <p className="mt-1 font-semibold text-white">{formatProfileBirth(currentProfile)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">????????濡μ뒙???</p>
                  <p className="mt-1 font-semibold text-white">{currentProfile.location?.label || "???"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">???????</p>
                  <p className="mt-1 font-semibold text-white">{currentProfile.location?.tz || "Asia/Seoul"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/18 p-4">
                  <p className="text-xs text-slate-400">??</p>
                  <p className="mt-1 font-semibold text-white">{currentProfile.gender === "M" ? "??" : currentProfile.gender === "F" ? "??" : "??"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-lg border border-dashed border-amber-300/25 bg-black/15 p-5 text-sm text-slate-300">
                ?饔낅떽??????????嫄?彛?????????꿔꺂????????嫄????????????濡μ뒙???????????ㅼ굣塋?????????諛몃마??λ???????諛몃마?????????關??濡녹춻?????????猷밴텭???????癲???꿔꺂??????
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddProfileClick}
                className={`rounded-md px-4 py-2 text-sm font-bold ${canCreateMore ? "bg-amber-300 text-slate-950" : "border border-amber-300/40 bg-amber-500/10 text-amber-100"}`}
              >
                ?????諛몃마??λ????????노듋?????????댄뱼???????ш끽維귞댆?              </button>
              <Link href="/" className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">
                ??????닿퉻??????쇰뮛????????
              </Link>
            </div>
          </article>

          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Profile List</p>
                <h2 className="mt-1 text-lg font-bold text-white">??? ??</h2>
              </div>
              {!canCreateMore ? (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="rounded-md border border-amber-300/35 px-3 py-2 text-xs font-semibold text-amber-100"
                >
                  ???????汝뷴젆??곌떽????
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {profiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-300">
                  ?????얜궙??뺣뙀?洹?㎦??????諛몃마??λ????????노듋???????룸뗀?? ??????깅즽????????놁졄.
                </div>
              ) : (
                profiles.map((profile) => {
                  const active = profile.id === currentId;
                  const activating = busyAction === `activate:${profile.id}`;
                  const editing = busyAction === `edit:${profile.id}`;
                  const deleting = busyAction === `delete:${profile.id}`;
                  const actionHint = profileActionPolicyNotice;
                  const menuOpen = activeProfileMenuId === profile.id;

                  return (
                    <div key={profile.id} className={`relative overflow-visible rounded-lg border p-3 ${menuOpen ? "z-30" : "z-0"} ${active ? "border-amber-300/45 bg-amber-300/10" : "border-white/10 bg-black/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{profile.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatProfileBirth(profile)}</p>
                          <p className="mt-1 text-[11px] font-semibold text-amber-200">{actionHint}</p>
                        </div>
                        <div ref={menuOpen ? activeProfileMenuRef : null} className="relative z-40 flex flex-none items-start gap-2">
                          {active ? <span className="mt-1 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-slate-950">??</span> : null}
                          <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label="프로필 카드 메뉴"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveProfileMenuId((prev) => prev === profile.id ? "" : profile.id);
                            }}
                            disabled={!!busyAction}
                            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-md border border-white/15 bg-black/25 text-xl font-black leading-none text-slate-100 shadow-lg shadow-black/20 disabled:opacity-35"
                          >
                            ⋯
                          </button>
                          {menuOpen ? (
                            <div
                              role="menu"
                              className="absolute right-0 top-full z-[80] mt-2 w-[min(78vw,13rem)] overflow-hidden rounded-lg border border-white/15 bg-[#11142b]/95 p-1.5 shadow-2xl shadow-black/45 backdrop-blur-xl"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void viewProfile(profile);
                                }}
                                disabled={activating || editing || deleting || (!!busyAction && !activating)}
                                className="flex min-h-[44px] w-full touch-manipulation items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-40"
                              >
                                <span>프로필 조회</span>
                                <span className="text-xs text-slate-400">{activating ? "..." : ""}</span>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditProfile(profile);
                                }}
                                disabled={editing || deleting || activating || !!busyAction}
                                className="flex min-h-[44px] w-full touch-manipulation items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-amber-100 hover:bg-amber-300/10 disabled:opacity-40"
                              >
                                {editing ? profileActionProgressLabel("edit", profileActionStage) : profileActionButtonLabel("edit", profileActionFreeLabel, profileActionCoinBalance)}
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteProfile(profile.id);
                                }}
                                disabled={deleting || editing || activating || !!busyAction}
                                className="flex min-h-[44px] w-full touch-manipulation items-center rounded-md px-3 py-2 text-left text-sm font-bold text-rose-100 hover:bg-rose-500/15 disabled:opacity-40"
                              >
                                {deleting ? profileActionProgressLabel("delete", profileActionStage) : profileActionButtonLabel("delete", profileActionFreeLabel, profileActionCoinBalance)}
                              </button>
                            </div>
                          ) : null}
                        </div>
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
              <h2 className="mt-1 text-xl font-bold text-white">?? PDF ???</h2>
              <p className="mt-1 text-sm text-slate-300">??????⑤뜪??????熬곣뫖利??????????덇텣?鰲???怨쀪덫????????껊뀋?PDF ????녾컯???觀萸???? ??????읐?????쇰뮛???????????살퓢????轅붽틓???????????????????????놁졄.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadPdfArchive()}
              className="rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200"
            >
              ????雅????????
            </button>
          </div>

          {archiveNotice ? (
            <div className="mt-4 rounded-lg border border-amber-300/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {archiveNotice}
            </div>
          ) : null}

          {archiveLoading ? (
            <div className="mt-4 rounded-lg border border-dashed border-white/20 p-4 text-sm text-slate-300">????쇰뮛????????얜끍??????⑥ル럯??????嶺뚮ㅎ????關???꾨き??熬곥룊?????????놁졄.</div>
          ) : archiveItems.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-white/20 p-4 text-sm text-slate-300">?????諛몃마??蹂㏓룾????熬곣뫖利????PDF ????녾컯???觀萸???? ??????깅즽????????놁졄.</div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {archiveItems.map((item) => {
                const displayName = String(item.displayName || "???? ???");
                const title = String(item.title || displayName);
                const subject = String(item.targetName || item.birthName || "").trim();
                return (
                  <article key={item.reportId} className="rounded-lg border border-white/10 bg-black/15 p-4">
                    <p className="text-xs font-semibold text-amber-200">{displayName}</p>
                    <h3 className="mt-1 text-base font-bold text-white">{title}</h3>
                    <p className="mt-2 text-xs text-slate-300">{formatArchiveDate(item.completedAt)} ?? ??</p>
                    <p className="mt-1 text-xs text-slate-400">?饔낅떽????ш낄?뉔뇡??? {modeLabel(item.mode)}{subject ? ` ??${subject}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/me/reports?reportId=${encodeURIComponent(item.reportId)}`}
                        className="rounded-md bg-amber-300 px-3 py-1.5 text-xs font-bold text-slate-900"
                      >
                        ??????살퓢???????????ш끽維귞댆?                      </Link>
                      {item.canDownload && item.pdfUrl ? (
                        <a
                          href={item.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200"
                        >
                          PDF ???嚥싲갭큔???癲??嶺???ル맪??
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

      {profilePassSuccessNotice ? (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="profilePassSuccessTitle">
          <div className="w-full max-w-sm rounded-3xl border border-amber-200/50 bg-gradient-to-br from-[#170e3d] via-[#34206f] to-[#111827] p-6 text-center shadow-2xl shadow-black/50">
            <img
              src="/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp"
              alt=""
              aria-hidden="true"
              className="mx-auto h-20 w-20 rounded-2xl object-contain shadow-lg shadow-amber-900/30"
            />
            <p className="mt-3 inline-flex rounded-full border border-amber-200/40 bg-white/10 px-3 py-1 text-xs font-black text-amber-100">
              {profilePassSuccessNotice.tierLabel}{" \uC774\uC6A9\uAD8C"}
            </p>
            <h3 id="profilePassSuccessTitle" className="mt-3 text-xl font-black text-white">
              {"\uC774\uC6A9\uAD8C \uC801\uC6A9 \uC644\uB8CC"}
            </h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-amber-50/85">
              {"\uBCF4\uC720 \uC911\uC778 \uC774\uC6A9\uAD8C\uC73C\uB85C \uC774 \uCF58\uD150\uCE20\uB97C \uBB34\uB8CC \uC774\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694."}
              <br />
              {"\uCF54\uC778\uACFC \uC6D4\uC815\uC11D\uC740 \uCC28\uAC10\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."}
            </p>
            <button
              type="button"
              onClick={() => setProfilePassSuccessNotice(null)}
              className="mt-5 min-h-[46px] w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/25"
            >
              {"\uBC14\uB85C \uBCF4\uAE30"}
            </button>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-amber-300/35 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 className="text-lg font-bold text-amber-100">??? ?? ??</h3>
            <p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
              {profileActionPolicyNotice}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {isVvipProfileActionFree
                ? "VVIP ??????⑤뜤?誘⑸쿋?????????????????????諛몃마???????諛몃마??λ????????노듋???????꿔꺂???????????깅짆????꿔꺂??????????轅붽틓?節됰쑏???????癰궽블뀯?????????????????놁졄."
                : "?????諛몃마??λ????????노듋????????癰궽블뀯??? 1??50?????밸븶??????????諛몃마????꿔꺂?????? ?????밸븶??????????뼿????怨쀫뮡???遺얘턁??????棺堉?뤃????5,000????棺堉?뤃???傭?끆?????ㅿ폑獄??饔낅떽?????嶺뚮ㅎ?????꿔꺂??????"}
            </p>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">{editTarget.name}</p>
              <p className="mt-1 text-xs text-slate-400">{formatProfileBirth(editTarget)}</p>
            </div>
            {busyAction === `edit:${editTarget.id}` ? (
              <div className="mt-3 rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
                {profileActionProgressLabel("edit", profileActionStage)}
              </div>
            ) : null}
            {authNotice ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-200">
                {authNotice}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-300">
                ??
                <input
                  value={editDraft.name}
                  onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-300">
                ??
                <select
                  value={editDraft.gender}
                  onChange={(event) => setEditDraft((prev) => ({ ...prev, gender: event.target.value as ProfileActionDraft["gender"] }))}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                >
                  <option value="OTHER">???</option>
                  <option value="M">??</option>
                  <option value="F">??</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  ????
                  <input
                    type="date"
                    value={editDraft.birthDate}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, birthDate: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  ????
                  <input type="time"
                    value={editDraft.birthTime}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, birthTime: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={!!busyAction}
                className="min-h-[44px] rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-45"
              >
                ??
              </button>
              <button
                type="button"
                onClick={() => editTarget && void runProfileActionFlow("edit", editTarget, editDraft)}
                disabled={!editDraft.name.trim() || !editDraft.birthDate || !editDraft.birthTime || !!busyAction}
                className="min-h-[44px] rounded-md bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-45"
              >
                {busyAction === `edit:${editTarget.id}` ? profileActionProgressLabel("edit", profileActionStage) : profileActionPrimaryLabel("edit", profileActionFreeLabel, profileActionCoinBalance)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-rose-300/35 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 className="text-lg font-bold text-rose-100">??? ?? ??</h3>
            <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
              {profileActionPolicyNotice}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {isVvipProfileActionFree
                ? "VVIP ??????⑤뜤?誘⑸쿋?????????????????????諛몃마???????諛몃마??λ????????노듋???????꿔꺂???????????깅짆????꿔꺂??????????轅붽틓?節됰쑏??????????????????????놁졄."
                : "?????諛몃마??λ????????노듋?????????1??50?????밸븶??????????諛몃마????꿔꺂?????? ??????????쇰뮛?筌믡꺂?뜻ㅀ袁⑦뀘?????? ????????????????????놁졄."}
            </p>
            <div className="mt-4 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">?? ??</p>
              <p className="mt-1 truncate text-base font-bold text-white">{deleteTarget.name}</p>
              <p className="mt-1 text-xs text-slate-300">{formatProfileBirth(deleteTarget)}</p>
            </div>
            {busyAction === `delete:${deleteTarget.id}` ? (
              <div className="mt-3 rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
                {profileActionProgressLabel("delete", profileActionStage)}
              </div>
            ) : null}
            {authNotice ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-200">
                {authNotice}
              </div>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={!!busyAction}
                className="min-h-[44px] rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-45"
              >
                ??????
              </button>
              <button
                type="button"
                onClick={() => void runProfileActionFlow("delete", deleteTarget)}
                disabled={!!busyAction}
                className="min-h-[44px] rounded-md bg-rose-400 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-rose-950/30 disabled:opacity-45"
              >
                {busyAction === `delete:${deleteTarget.id}` ? profileActionProgressLabel("delete", profileActionStage) : profileActionPrimaryLabel("delete", profileActionFreeLabel, profileActionCoinBalance)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-amber-300/35 bg-[#171a34] p-5 shadow-2xl shadow-black/40">
            <h3 className="text-lg font-bold text-amber-100">?????諛몃마??λ????????노듋???????꿔꺂???????????諛몃마??????????????놁졄</h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              ??????????⑤뜤?誘⑸쿋???????????嶺뚮ㅎ?????鶯ㅺ동??????? ?????諛몃마??λ????????노듋?????壤굿?쒓낯??1????ル늉????????????熬곣뫖利??????????????????놁졄. ????????노듋?????壤굿?쒓낯???????곸궔?????녾컯???觀萸???????ル뒇????????????⑤뜤?誘⑸쿋?????????關?쒎첎?嫄??怨몃룯????????⑹름??????뭽??
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                ???????
              </button>
              <Link
                href="/points"
                className="rounded-md bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900"
                onClick={() => setShowUpgradeModal(false)}
              >
                ??????⑤뜤?誘⑸쿋?????關?쒎첎?嫄??怨몃룯??????ш끽維귞댆?              </Link>
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
