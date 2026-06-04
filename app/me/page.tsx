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
  rawTier?: "free" | "standard" | "premium" | "vvip";
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

type ProfileActionStage = "" | "payment" | "coin" | "saving" | "deleting";

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
  amount: number;
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
  return action === "edit" ? "수정" : "삭제";
}

function profileActionProductName(action: ProfileActionType) {
  return `프로필 카드 ${profileActionLabel(action)}`;
}

function profileActionButtonLabel(action: ProfileActionType, isVvipFree: boolean, coinBalance: number) {
  const label = profileActionLabel(action);
  if (isVvipFree) return `${label} · VVIP 무료`;
  if (coinBalance >= PROFILE_CARD_ACTION_COST_COINS) return `${label} · ${PROFILE_CARD_ACTION_COST_COINS}코인`;
  return `${label} · ${PROFILE_CARD_ACTION_COST_KRW.toLocaleString("ko-KR")}원`;
}

function profileActionPrimaryLabel(action: ProfileActionType, isVvipFree: boolean, coinBalance: number) {
  if (isVvipFree) return `VVIP 무료 ${profileActionLabel(action)}`;
  if (coinBalance >= PROFILE_CARD_ACTION_COST_COINS) return `${PROFILE_CARD_ACTION_COST_COINS}코인 사용`;
  return `${PROFILE_CARD_ACTION_COST_KRW.toLocaleString("ko-KR")}원 결제`;
}

function profileActionProgressLabel(action: ProfileActionType, stage: ProfileActionStage) {
  if (stage === "payment") return "결제창을 여는 중입니다.";
  if (stage === "coin") return "코인을 차감하는 중입니다.";
  if (stage === "saving") return "수정 내용을 저장하는 중입니다.";
  if (stage === "deleting") return "프로필 카드를 삭제하는 중입니다.";
  return action === "edit" ? "수정 처리 중입니다." : "삭제 처리 중입니다.";
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
    throw new Error("결제에 사용할 이메일을 확인해 주세요.");
  }
  return {
    customerId: String(merged.id || merged.userId || merged.uid || merged._id || paymentId).trim(),
    fullName: String(merged.name || "회원").trim(),
    email,
  };
}

function mapPaymentErrorMessage(message?: string) {
  const text = String(message || "").trim();
  return text || "결제가 완료되지 않았습니다.";
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

  const currentProfile = profiles.find((profile) => profile.id === currentId) || profiles[0] || null;
  const profileLimit = subscription.profileLimit > 0 ? subscription.profileLimit : 1;
  const slotPercent = Math.min(100, Math.round((profiles.length / profileLimit) * 100));
  const monthlyStoneBalance = formatMonthlyStoneBalance(user?.points);
  const profileActionCoinBalance = Math.max(0, Math.floor(Number(membershipCreditBalance || 0) / 10));
  const isVvipProfileActionFree = subscription.isActive && subscription.tier === "vvip" && profiles.length <= profileLimit;
  const hasStoredVvipPass = subscription.rawTier === "vvip" || subscription.tier === "vvip";
  const isExpiredVvipProfileAction = hasStoredVvipPass && !subscription.isActive;
  const isVvipProfileLimitExceeded = subscription.isActive && subscription.tier === "vvip" && profiles.length > profileLimit;
  const profileActionPolicyNotice = isVvipProfileActionFree
    ? "VVIP 혜택 적용 중 · 한도 내 무료 관리"
    : isExpiredVvipProfileAction
      ? "이용권이 만료되어 50코인이 필요합니다."
      : isVvipProfileLimitExceeded
        ? "VVIP 프로필 카드 한도를 넘어 50코인이 필요합니다."
        : "프로필 카드 수정/삭제는 1회 50코인입니다.";

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
            profileLimit: Number(payload.subscription.profileLimit || 1),
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
          membershipCreditBalance?: number;
          membership?: { membershipCreditBalance?: number };
          legacyCoinBalance?: number;
          balance?: number;
        };
        user?: { points?: number };
      }>(response);
      const data = payload.data || {};
      const credit = Number(data.membershipCreditBalance ?? data.membership?.membershipCreditBalance ?? 0);
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
  }, [apiBase, loadPdfArchive, loadProfileState, refreshProfileActionBalance, router]);

  const ensurePortoneSdk = useCallback(() => new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제를 진행할 수 있습니다."));
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
        else reject(new Error("포트원 V2 SDK가 초기화되지 않았습니다."));
      }, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("결제 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.PortOne?.requestPayment) resolve();
      else reject(new Error("포트원 V2 SDK가 초기화되지 않았습니다."));
    };
    script.onerror = () => reject(new Error("결제 SDK를 불러오지 못했습니다."));
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
      throw new Error(payload.message || "포트원 V2 결제 설정을 확인할 수 없습니다.");
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
      throw new Error(preparePayload.message || "결제 준비에 실패했습니다.");
    }

    await ensurePortoneSdk();
    if (!window.PortOne?.requestPayment) throw new Error("포트원 V2 결제 SDK가 초기화되지 않았습니다.");

    const paymentConfig = await fetchPortOnePaymentConfig();
    const redirectUrl = new URL("/me", window.location.origin);
    redirectUrl.searchParams.set("portone_redirect", "1");

    const paymentRequest: PortOnePaymentRequest = {
      storeId: paymentConfig.storeId,
      channelKey: paymentConfig.channelKey,
      paymentId: order.merchantUid,
      orderName: order.productName || productName,
      amount: Number(order.paymentAmount || PROFILE_CARD_ACTION_COST_KRW),
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
    if (!confirmResponse.ok) throw new Error(confirmPayload.message || "서버 결제 검증에 실패했습니다.");
    return {
      accessGrant: confirmPayload.accessGrant || null,
      payment: confirmPayload.payment || null,
      merchantUid: order.merchantUid,
      paymentId,
    };
  }, [apiBase, ensurePortoneSdk, fetchPortOnePaymentConfig, user]);

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
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || `${profileActionProductName(action)}에 실패했습니다.`);

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
      if (!isVvipProfileActionFree && !hasCoinBalance) {
        setProfileActionStage("payment");
        const payment = await runProfileActionCardPayment(action, profile, requestId);
        paymentContext = {
          accessGrant: payment.accessGrant || undefined,
          payment: payment.payment || undefined,
          merchantUid: payment.merchantUid,
          paymentId: payment.paymentId,
        };
      } else if (!isVvipProfileActionFree) {
        setProfileActionStage("coin");
      }
      if (isVvipProfileActionFree || paymentContext) {
        setProfileActionStage(action === "edit" ? "saving" : "deleting");
      }
      await executeProfileAction(action, profile, requestId, paymentContext, draft);
      setAuthNotice(isVvipProfileActionFree
        ? `VVIP 이용권 혜택으로 무료 ${label} 완료`
        : `${profileActionProductName(action)}이 완료되었습니다.`);
      if (action === "edit") setEditTarget(null);
      if (action === "delete") setDeleteTarget(null);
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : `${profileActionProductName(action)} 중 오류가 발생했습니다.`);
    } finally {
      setBusyAction("");
      setProfileActionStage("");
    }
  }, [executeProfileAction, isVvipProfileActionFree, profileActionCoinBalance, runProfileActionCardPayment]);

  const openEditProfile = (profile: DestinyProfile) => {
    setEditTarget(profile);
    setEditDraft(buildEditDraft(profile));
    setAuthNotice("");
  };

  const deleteProfile = async (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      setAuthNotice("삭제할 프로필 카드를 찾을 수 없습니다.");
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
                  const editing = busyAction === `edit:${profile.id}`;
                  const deleting = busyAction === `delete:${profile.id}`;
                  const actionHint = profileActionPolicyNotice;

                  return (
                    <div key={profile.id} className={`rounded-lg border p-3 ${active ? "border-amber-300/45 bg-amber-300/10" : "border-white/10 bg-black/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{profile.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatProfileBirth(profile)}</p>
                          <p className="mt-1 text-[11px] font-semibold text-amber-200">{actionHint}</p>
                        </div>
                        {active ? <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-slate-950">활성</span> : null}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => void activateProfile(profile.id)}
                          disabled={active || activating || editing || deleting || !!busyAction}
                          className="min-h-[44px] rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-45"
                        >
                          {activating ? "처리중..." : "사용"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditProfile(profile)}
                          disabled={editing || deleting || activating || !!busyAction}
                          className="min-h-[44px] rounded-md border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-35"
                        >
                          {editing ? profileActionProgressLabel("edit", profileActionStage) : profileActionButtonLabel("edit", isVvipProfileActionFree, profileActionCoinBalance)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteProfile(profile.id)}
                          disabled={deleting || editing || activating || !!busyAction}
                          className="min-h-[44px] rounded-md border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 disabled:opacity-35"
                        >
                          {deleting ? profileActionProgressLabel("delete", profileActionStage) : profileActionButtonLabel("delete", isVvipProfileActionFree, profileActionCoinBalance)}
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

      {editTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-amber-300/35 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 className="text-lg font-bold text-amber-100">프로필 카드 수정</h3>
            <p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
              {profileActionPolicyNotice}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {isVvipProfileActionFree
                ? "VVIP 이용권 혜택으로 현재 프로필 카드 한도 내에서는 무료로 수정할 수 있습니다."
                : "프로필 카드 수정은 1회 50코인이 필요합니다. 코인이 부족한 경우 5,000원 결제로 진행됩니다."}
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
                이름
                <input
                  value={editDraft.name}
                  onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-300">
                성별
                <select
                  value={editDraft.gender}
                  onChange={(event) => setEditDraft((prev) => ({ ...prev, gender: event.target.value as ProfileActionDraft["gender"] }))}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                >
                  <option value="OTHER">미선택</option>
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  생년월일
                  <input
                    type="date"
                    value={editDraft.birthDate}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, birthDate: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  출생시간
                  <input
                    type="time"
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
                취소
              </button>
              <button
                type="button"
                onClick={() => editTarget && void runProfileActionFlow("edit", editTarget, editDraft)}
                disabled={!editDraft.name.trim() || !editDraft.birthDate || !editDraft.birthTime || !!busyAction}
                className="min-h-[44px] rounded-md bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-45"
              >
                {busyAction === `edit:${editTarget.id}` ? profileActionProgressLabel("edit", profileActionStage) : profileActionPrimaryLabel("edit", isVvipProfileActionFree, profileActionCoinBalance)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-rose-300/35 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 className="text-lg font-bold text-rose-100">프로필 카드 삭제</h3>
            <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
              {profileActionPolicyNotice}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {isVvipProfileActionFree
                ? "VVIP 이용권 혜택으로 현재 프로필 카드 한도 내에서는 무료로 삭제할 수 있습니다."
                : "프로필 카드 삭제는 1회 50코인이 필요합니다. 삭제 후 복구가 어려울 수 있습니다."}
            </p>
            <div className="mt-4 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">삭제 대상</p>
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
                취소
              </button>
              <button
                type="button"
                onClick={() => void runProfileActionFlow("delete", deleteTarget)}
                disabled={!!busyAction}
                className="min-h-[44px] rounded-md bg-rose-400 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-rose-950/30 disabled:opacity-45"
              >
                {busyAction === `delete:${deleteTarget.id}` ? profileActionProgressLabel("delete", profileActionStage) : profileActionPrimaryLabel("delete", isVvipProfileActionFree, profileActionCoinBalance)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
