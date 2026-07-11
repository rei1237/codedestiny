"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, clearClientAuthState } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { getAuthState, logout, refreshAuth } from "../_lib/auth-store";
import { persistSanitizedAuthUser, readSanitizedAuthUser } from "../_lib/auth-storage";
import { resolveMonthlyStoneBalance } from "../_lib/monthly-stone";
import { clearActiveDestinyProfileCache, publishDestinyProfileList } from "../_lib/profile-card-storage";
import WithdrawModal from "../components/WithdrawModal";
import { formatBirthDateDigits, normalizeBirthDateFromDigits } from "@/lib/birthDateInput";

type AuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  hasLocalAuth?: boolean;
  role?: "user" | "admin";
  points?: number;
};

type DestinyProfile = {
  id: string;
  profileId?: string;
  name: string;
  gender?: "M" | "F" | "OTHER";
  birthDate?: string;
  birthTime?: string;
  calendarType?: string;
  isDefault?: boolean;
  selected?: boolean;
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
  updatedAt?: string | null;
  isActive?: boolean;
};

type ProfileSubscription = {
  tier: "free" | "standard" | "premium" | "vvip" | "family";
  rawTier?: "free" | "standard" | "premium" | "vvip" | "family";
  isActive: boolean;
  profileLimit: number;
  freeLimit?: number;
  startedAt?: string | null;
  expiresAt: string | null;
};

type ProfileStatePayload = {
  ok?: boolean;
  profiles?: DestinyProfile[];
  currentId?: string;
  canCreateMore?: boolean;
  subscription?: ProfileSubscription;
};


type ProfileActionType = "create" | "delete";

type ProfileActionStage = "" | "payment" | "coin" | "saving" | "deleting";
type ProfileActionPaymentMethod = "card" | "monthly_stones";

type ProfileActionDraft = {
  name: string;
  gender: "M" | "F" | "OTHER";
  birthDate: string;
  birthTime: string;
};

type ProfileCreateDraft = ProfileActionDraft & {
  calType: "solar" | "lunar" | "lunar_leap";
  locationLabel: string;
  longitude: string;
  latitude: string;
  timezone: string;
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

const ME_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "mePage.001": "서버 JSON 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    "mePage.002": "프로필 상세 정보를 불러오지 못했습니다.",
    "mePage.003": "프로필 카드 추가 처리 중 오류가 발생했습니다.",
    "mePage.004": "프로필 카드 메뉴",
    "mePage.005": "프로필 조회",
    "mePage.006": "기타",
    "mePage.007": "남성",
    "mePage.008": "여성",
    "mePage.009": "양력",
    "mePage.010": "음력",
    "mePage.011": "윤달",
    "mePage.012": "대한민국 · 서울",
  },
} as const;

function mePageText(key: keyof typeof ME_PAGE_TEXT_TRANSLATIONS.ko): string {
  return ME_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
declare global {
  interface Window {
    PortOne?: {
      requestPayment: (request: PortOnePaymentRequest) => Promise<PortOnePaymentResponse>;
    };
    _cdSetCoinGateOverlay?: (isOpen: boolean, message?: string, mode?: string) => void;
  }
}

const PROFILE_CARD_ACTION_COST_COINS = 50;
const PROFILE_CARD_ACTION_COST_KRW = 5000;
const PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST = PROFILE_CARD_ACTION_COST_COINS * 10;
const PROFILE_CARD_ACTION_FEATURE_KEY = "profile-card-manage";
const PROFILE_CARD_ACTION_SERVICE_TYPE = "profile_card_action";
const PROFILE_CARD_ACTION_PRODUCTS = {
  delete: {
    productId: "profile_card_delete_50c",
    actionType: "profile_card_delete",
    orderName: "프로필 카드 삭제",
  },
  create: {
    productId: "profile_card_add_extra_50c",
    actionType: "profile_card_add_extra",
    orderName: "프로필 카드 추가",
  },
} as const;

async function safeParseJson<T>(response: Response): Promise<T & { message?: string; ok?: boolean }> {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {
        ok: false,
        message: mePageText("mePage.001"),
      } as T & { message?: string; ok?: boolean };
    }
  }

  const text = await response.text().catch(() => "");
  return {
    ok: response.ok,
    message: text.trim() || (response.ok ? "" : "서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요."),
  } as T & { message?: string; ok?: boolean };
}

function profileActionLabel(action: ProfileActionType) {
  return action === "create" ? "\uCD94\uAC00" : "\uC0AD\uC81C";
}

function profileActionProductName(action: ProfileActionType) {
  return PROFILE_CARD_ACTION_PRODUCTS[action].orderName;
}

function profileActionButtonLabel(action: ProfileActionType) {
  const label = profileActionLabel(action);
  if (action === "delete") return `${label} · ${PROFILE_CARD_ACTION_COST_KRW.toLocaleString("ko-KR")}원`;
  return label;
}

function formatMonthlyStoneValue(monthlyStoneBalance?: number) {
  const value = Number(monthlyStoneBalance || 0);
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return `${(safeValue * 10).toLocaleString("ko-KR")}원 상당`;
}

function profileActionPrimaryLabel(action: ProfileActionType, method?: ProfileActionPaymentMethod) {
  if (method === "monthly_stones") return `월정석 ${formatMonthlyStoneValue(PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST)} 사용`;
  if (method === "card") return `${PROFILE_CARD_ACTION_COST_KRW.toLocaleString("ko-KR")}원 결제`;
  return profileActionButtonLabel(action);
}

function profileActionProgressLabel(action: ProfileActionType, stage: ProfileActionStage) {
  if (stage === "payment") return "결제창을 여는 중입니다.";
  if (stage === "coin") return "월정석을 적용하는 중입니다.";
  if (stage === "saving") return action === "delete" ? "\uD504\uB85C\uD544 \uCE74\uB4DC\uB97C \uC0AD\uC81C\uD558\uB294 \uC911\uC785\uB2C8\uB2E4." : `${profileActionLabel(action)} \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4.`;
  if (stage === "deleting") return "\uD504\uB85C\uD544 \uCE74\uB4DC\uB97C \uC0AD\uC81C\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.";
  return action === "create" ? "\uCD94\uAC00 \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4." : "\uC0AD\uC81C \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4.";
}


function buildProfileActionRequestId(action: ProfileActionType | "create", profileId: string) {
  return `profile-card:${action}:${profileId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`.slice(0, 120);
}

function buildNewProfileId() {
  return `dp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`.slice(0, 80);
}

function buildCreateDraft(): ProfileCreateDraft {
  return {
    name: "",
    gender: "OTHER",
    birthDate: "",
    birthTime: "00:00",
    calType: "solar",
    locationLabel: "",
    longitude: "127.0",
    latitude: "37.5",
    timezone: "Asia/Seoul",
  };
}

function normalizePaymentPhoneNumber(value: string): string {
  const digits = String(value || "").replace(/\D+/g, "");
  const normalized = digits.startsWith("82") && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
  return /^01\d{8,9}$/.test(normalized) ? normalized : "";
}

async function getSavedPaymentPhoneNumber(apiBase: string): Promise<string> {
  const response = await authFetch(`${apiBase}/api/me/payment-phone`, {
    method: "GET",
    credentials: "include",
  }, {
    retryOn401: true,
    apiBase,
  });
  const payload = await safeParseJson<{ phoneNumber?: string; phone?: string; message?: string }>(response);
  if (!response.ok) throw new Error(payload.message || "결제용 휴대폰 번호를 확인하지 못했습니다.");
  return normalizePaymentPhoneNumber(payload.phoneNumber || payload.phone || "");
}

async function savePaymentPhoneNumber(apiBase: string, phoneNumber: string): Promise<string> {
  const response = await authFetch(`${apiBase}/api/me/payment-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phone: phoneNumber }),
  }, {
    retryOn401: true,
    apiBase,
  });
  const payload = await safeParseJson<{ phoneNumber?: string; phone?: string; message?: string }>(response);
  if (!response.ok) throw new Error(payload.message || "휴대폰 번호 저장에 실패했습니다.");
  return normalizePaymentPhoneNumber(payload.phoneNumber || payload.phone || phoneNumber);
}

async function ensurePaymentPhoneNumber(apiBase: string, user: AuthUser | null): Promise<string> {
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const current = normalizePaymentPhoneNumber(user?.phoneNumber || user?.phone || cachedUser?.phoneNumber || cachedUser?.phone || "");
  if (current) return current;
  const saved = await getSavedPaymentPhoneNumber(apiBase).catch(() => "");
  if (saved) return saved;
  const typed = window.prompt("이니시스 단건결제를 위해 구매자 휴대폰 번호가 필요합니다. 최초 1회만 입력해 주세요.", "");
  const normalized = normalizePaymentPhoneNumber(typed || "");
  if (!normalized) throw new Error("이니시스 결제를 진행하려면 구매자 휴대폰 번호가 필요합니다.");
  const nextPhone = await savePaymentPhoneNumber(apiBase, normalized);
  const latestUser = readSanitizedAuthUser() as AuthUser | null;
  if (latestUser) persistSanitizedAuthUser({ ...latestUser, phoneNumber: nextPhone, phone: latestUser.phone || nextPhone });
  return nextPhone;
}

function buildPortOneCustomer(user: AuthUser | null, paymentId: string, phoneNumber = "") {
  const merged = { ...((readSanitizedAuthUser() as AuthUser | null) || {}), ...(user || {}) } as AuthUser;
  const email = String(merged.email || "").trim();
  if (!/^[^@\s]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("결제 진행에 필요한 이메일 정보를 확인해 주세요.");
  }
  return {
    customerId: String(merged.id || merged.userId || merged.uid || merged._id || paymentId).trim(),
    fullName: String(merged.name || "\uACE0\uAC1D").trim(),
    email,
    phoneNumber: normalizePaymentPhoneNumber(phoneNumber || merged.phoneNumber || merged.phone || ""),
  };
}

async function closeSharedPaymentOverlayBeforeExternalCheckout() {
  if (typeof window === "undefined") return;
  window._cdSetCoinGateOverlay?.(false);
  await new Promise<void>((resolve) => {
    if (typeof window.requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });
}

function mapPaymentErrorMessage(message?: string) {
  const text = String(message || "").trim();
  return text || "결제가 취소되었거나 완료되지 않았습니다.";
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
  if (tier === "standard") return "스탠다드 꿀 30일";
  if (tier === "premium") return "프리미엄 꿀 30일";
  if (tier === "vvip") return "VVIP 꿀단지 30일";
  if (tier === "family") return "Code Destiny Family 30일";
  return "\uBB34\uB8CC \uACC4\uC815";
}

function formatProfileSubscriptionDate(raw?: string | null) {
  if (!raw) return "없음";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date).replace(/\s/g, " ");
}

function formatProfileSubscriptionDaysLeft(raw?: string | null) {
  if (!raw) return "없음";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "없음";
  return `${Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000)).toLocaleString("ko-KR")}일`;
}

function profileSubscriptionBenefit(subscription: ProfileSubscription) {
  if (!subscription.isActive) return "단건 결제 또는 이용권 혜택으로 이용";
  if (subscription.tier === "family") return "모든 유료 기능 이용 가능";
  const freeLimit = Number(subscription.freeLimit || 0);
  return freeLimit > 0 ? `${(freeLimit * 100).toLocaleString("ko-KR")}원 이하 기능 이용 가능` : "이용권 혜택 적용 중";
}

function formatMonthlyStoneBalance(monthlyStoneBalance?: number) {
  return formatMonthlyStoneValue(monthlyStoneBalance);
}

function fallbackSubscription(): ProfileSubscription {
  return {
    tier: "free",
    rawTier: "free",
    isActive: false,
    profileLimit: 1,
    freeLimit: 0,
    startedAt: null,
    expiresAt: null,
  };
}

function emitDestinyProfileChanged(profiles: DestinyProfile[], currentId: string) {
  const active = profiles.find((profile) => profile.id === currentId) || null;
  window.dispatchEvent(new CustomEvent("destinyProfileChanged", { detail: active }));
}

function formatArchiveDate(raw?: string) {
  if (!raw) return "날짜 없음";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
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
  if (token.includes("solo")) return "개인";
  return "운세";
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
  const [reloadKey, setReloadKey] = useState(0);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [hasLocalAuth, setHasLocalAuth] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [busyAction, setBusyAction] = useState<string>("");
  const [monthlyStoneBalance, setMonthlyStoneBalance] = useState(0);
  const [isCreateProfileOpen, setIsCreateProfileOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ProfileCreateDraft>(buildCreateDraft());
  const [viewingProfile, setViewingProfile] = useState<DestinyProfile | null>(null);
  const [viewingProfileLoadingId, setViewingProfileLoadingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DestinyProfile | null>(null);
  const [profileActionStage, setProfileActionStage] = useState<ProfileActionStage>("");
  const [activeProfileMenuId, setActiveProfileMenuId] = useState("");
  const activeProfileMenuRef = useRef<HTMLDivElement | null>(null);
  const activeProfileCardRef = useRef<HTMLElement | null>(null);

  const currentProfile = profiles.find((profile) => profile.id === currentId) || profiles[0] || null;
  const isFamilyProfilePlan = subscription.isActive && subscription.tier === "family";
  const isUnlimitedProfilePlan = isFamilyProfilePlan || (subscription.isActive && subscription.profileLimit === 0);
  const profileLimit = isUnlimitedProfilePlan ? Math.max(profiles.length, 1) : (subscription.profileLimit > 0 ? subscription.profileLimit : 1);
  const profileLimitLabel = isUnlimitedProfilePlan ? "무제한" : String(profileLimit);
  const slotPercent = isUnlimitedProfilePlan ? 100 : Math.min(100, Math.round((profiles.length / profileLimit) * 100));
  const monthlyStoneBalanceLabel = formatMonthlyStoneBalance(monthlyStoneBalance);
  const hasEnoughMonthlyStonesForProfileAction = monthlyStoneBalance >= PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST;
  const canCreateInitialProfileForFree = profiles.length === 0;
  const createRequiresProfileActionPayment = !isFamilyProfilePlan && !canCreateInitialProfileForFree;
  const deleteRequiresProfileActionPayment = !isFamilyProfilePlan;
  const profileActionPolicyNotice = isFamilyProfilePlan
    ? "Code Destiny Family 이용권으로 프로필 생성과 삭제를 제한 없이 진행할 수 있습니다."
    : "프로필 카드 삭제에는 5,000원 결제가 필요합니다.";
  const subscriptionStartedAtLabel = formatProfileSubscriptionDate(subscription.startedAt);
  const subscriptionExpiresAtLabel = formatProfileSubscriptionDate(subscription.expiresAt);
  const subscriptionDaysLeftLabel = formatProfileSubscriptionDaysLeft(subscription.expiresAt);
  const subscriptionBenefitLabel = profileSubscriptionBenefit(subscription);

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
            freeLimit: Number.isFinite(Number(payload.subscription.freeLimit)) ? Math.max(0, Math.floor(Number(payload.subscription.freeLimit))) : 0,
            startedAt: payload.subscription.startedAt || null,
            expiresAt: payload.subscription.expiresAt || null,
        }
      : fallbackSubscription();

    setProfiles(nextProfiles);
    setCurrentId(nextCurrentId);
    setSubscription(nextSubscription);
    setCanCreateMore(payload.canCreateMore !== false);
    publishDestinyProfileList(nextProfiles, nextCurrentId);
    emitDestinyProfileChanged(nextProfiles, nextCurrentId);
  }, []);

  const clearProfileState = useCallback(() => {
    setProfiles([]);
    setCurrentId("");
    setCanCreateMore(true);
    setViewingProfile(null);
    setActiveProfileMenuId("");
    clearActiveDestinyProfileCache();
    emitDestinyProfileChanged([], "");
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
          monthlyStoneBalance?: number;
          membershipCreditBalance?: number;
          membership?: { monthlyStoneBalance?: number; membershipCreditBalance?: number };
          legacyCoinBalance?: number;
          balance?: number;
        };
        user?: { points?: number };
      }>(response);
      const data = payload.data || {};
      setMonthlyStoneBalance(resolveMonthlyStoneBalance(data, data.membership) ?? 0);
      const nextPoints = Number(data.legacyCoinBalance ?? data.balance ?? payload.user?.points ?? user?.points ?? 0);
      if (Number.isFinite(nextPoints)) {
        setUser((prev) => prev ? { ...prev, points: Math.max(0, Math.floor(nextPoints)) } : prev);
      }
    } catch {
      setMonthlyStoneBalance(0);
    }
  }, [apiBase, user?.points]);

  /* ── 월정석 잔량 실시간 반영: 차감/지급 표준 브로드캐스트 구독 ─────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFromDetail = (detail: unknown) => {
      const next = resolveMonthlyStoneBalance(detail);
      if (next !== null) setMonthlyStoneBalance(next); // null이면(잔량 없는 이벤트) 유지
    };
    const onBillingBalanceUpdated = (event: Event) => {
      applyFromDetail((event as CustomEvent<Record<string, unknown>>)?.detail || {});
    };
    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>)?.detail;
      if (String((detail as { event?: unknown } | undefined)?.event || "").toLowerCase() !== "monthlystonebalance") return;
      applyFromDetail(detail);
    };
    window.addEventListener("cd:billing-balance-updated", onBillingBalanceUpdated as EventListener);
    window.addEventListener("cd:auth-changed", onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("cd:billing-balance-updated", onBillingBalanceUpdated as EventListener);
      window.removeEventListener("cd:auth-changed", onAuthChanged as EventListener);
    };
  }, []);

  const loadProfileState = useCallback(async () => {
    clearProfileState();
    const response = await authFetch(`${apiBase}/api/profile`, {
      method: "GET",
      cache: "no-store",
    }, {
      retryOn401: true,
      apiBase,
    });

    const payload = await safeParseJson<ProfileStatePayload>(response);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("auth_invalid");
      }
      throw new Error(String(payload?.message || "profile_state_failed"));
    }
    // 200 OK인데 payload.ok가 false면(서버 방어분기·DB 일시오류·JSON 파싱 실패 합성) 조용히 빈 카드로
    // 남기지 말고 non-auth 에러로 올려 배너+재시도 경로를 태운다.
    if (!payload || payload.ok !== true) {
      throw new Error(String(payload?.message || "profile_state_unavailable"));
    }

    applyProfilePayload(payload);
  }, [apiBase, applyProfilePayload, clearProfileState]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const cachedUser = readCachedUser();
      if (mounted) {
        setLoading(true);
        setUser(cachedUser);
        setHasLocalAuth(cachedUser?.hasLocalAuth !== false);
        clearProfileState();
      }

      try {
        await refreshAuth({ force: false, silent: true });
        const nextUser = (getAuthState().user || null) as AuthUser | null;

        // 클라이언트측 인증 스냅샷으로 카드를 게이팅하지 않는다. 인앱 브라우저에서 로컬 힌트가
        // 없어 게스트로 위조돼도 서버 쿠키는 유효할 수 있으므로, 최종 인증 판정은 서버(loadProfileState의
        // 401/403)에 맡긴다. 캐시 사용자가 있으면 표시만 갱신한다.
        if (mounted && nextUser) {
          persistSanitizedAuthUser(nextUser);
          setUser(nextUser);
          setHasLocalAuth(nextUser?.hasLocalAuth !== false);
        }
        if (mounted) setAuthNotice("");

        if (mounted) {
          await loadProfileState();
          await refreshProfileActionBalance();
        }
      } catch (error) {
        if (!mounted) return;
        // 로그인 이동은 서버가 실제로 401/403을 반환할 때만(loadProfileState의 auth_invalid).
        if (error instanceof Error && error.message === "auth_invalid") {
          clearAuth();
          router.replace("/login?next=%2Fme");
          return;
        }
        // 그 외(일시장애·{ok:false}·네트워크)는 카드를 없애지 않고 배너+재시도로.
        setAuthNotice("내 운명 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
  }, [apiBase, clearProfileState, loadProfileState, refreshProfileActionBalance, router, reloadKey]);

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
        else reject(new Error("PortOne V2 SDK를 불러오지 못했습니다."));
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
      else reject(new Error("PortOne V2 SDK를 불러오지 못했습니다."));
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
      throw new Error(payload.message || "PortOne V2 결제 설정을 확인할 수 없습니다.");
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
    const product = PROFILE_CARD_ACTION_PRODUCTS[action];
    const productName = product.orderName;
    const productId = product.productId;
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
        actionType: product.actionType,
        profileAction: action,
        action,
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
      throw new Error(preparePayload.message || "결제 요청을 준비하지 못했습니다.");
    }

    await ensurePortoneSdk();
    if (!window.PortOne?.requestPayment) throw new Error("PortOne V2 결제 SDK를 사용할 수 없습니다.");

    const paymentConfig = await fetchPortOnePaymentConfig();
    const redirectUrl = new URL("/me", window.location.origin);
    redirectUrl.searchParams.set("portone_redirect", "1");
    const customerPhoneNumber = await ensurePaymentPhoneNumber(apiBase, user);
    setUser((prev) => prev ? { ...prev, phoneNumber: customerPhoneNumber, phone: prev.phone || customerPhoneNumber } : prev);

    const paymentRequest: PortOnePaymentRequest = {
      storeId: paymentConfig.storeId,
      channelKey: paymentConfig.channelKey,
      paymentId: order.merchantUid,
      orderName: order.productName || productName,
      totalAmount: Number(order.paymentAmount || PROFILE_CARD_ACTION_COST_KRW),
      currency: paymentConfig.currency || "CURRENCY_KRW",
      payMethod: paymentConfig.payMethod || "CARD",
      redirectUrl: redirectUrl.toString(),
      customer: buildPortOneCustomer(user, order.merchantUid, customerPhoneNumber),
      customData: {
        productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        actionType: product.actionType,
        profileAction: action,
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

    await closeSharedPaymentOverlayBeforeExternalCheckout();
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
        actionType: product.actionType,
        profileAction: action,
        action,
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
    if (!confirmResponse.ok) throw new Error(confirmPayload.message || "결제 승인 확인에 실패했습니다.");
    return {
      accessGrant: confirmPayload.accessGrant || null,
      payment: confirmPayload.payment || null,
      merchantUid: order.merchantUid,
      paymentId,
    };
  }, [apiBase, ensurePortoneSdk, fetchPortOnePaymentConfig, user]);

  const viewProfile = async (profile: DestinyProfile) => {
    setActiveProfileMenuId("");
    setViewingProfileLoadingId(profile.id);
    try {
      const response = await authFetch(`${apiBase}/api/profile/${encodeURIComponent(profile.id)}`, {
        method: "GET",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      const payload = await safeParseJson<{ profile?: DestinyProfile; code?: string }>(response);
      if (!response.ok || !payload?.profile) {
        throw new Error(payload?.message || "프로필 상세 정보를 불러오지 못했습니다.");
      }
      setViewingProfile(payload.profile);
      setAuthNotice("");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : mePageText("mePage.002"));
    } finally {
      setViewingProfileLoadingId("");
    }
  };

  const activateProfile = useCallback(async (profile: DestinyProfile) => {
    if (busyAction || profile.id === currentId) return;
    setActiveProfileMenuId("");
    setBusyAction(`activate:${profile.id}`);
    try {
      const response = await authFetch(`${apiBase}/api/profile/current`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ currentId: profile.id }),
      }, {
        retryOn401: true,
        apiBase,
      });
      const payload = await safeParseJson<{ ok?: boolean; currentId?: string; message?: string }>(response);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "대표 프로필을 변경하지 못했습니다.");
      }
      const nextCurrentId = String(payload.currentId || profile.id);
      const nextProfiles = profiles.map((item) => ({
        ...item,
        isDefault: item.id === nextCurrentId,
        selected: item.id === nextCurrentId,
      }));
      setProfiles(nextProfiles);
      setCurrentId(nextCurrentId);
      publishDestinyProfileList(nextProfiles, nextCurrentId);
      emitDestinyProfileChanged(nextProfiles, nextCurrentId);
      setAuthNotice("대표 프로필이 변경되었습니다.");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "대표 프로필 변경 중 오류가 발생했습니다.");
    } finally {
      setBusyAction("");
    }
  }, [apiBase, busyAction, currentId, profiles]);

  const executeProfileAction = useCallback(async (
    action: "delete",
    profile: DestinyProfile,
    requestId: string,
    paymentContext: Record<string, unknown> | null,
  ) => {
    const body: Record<string, unknown> = {
      requestId,
      productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
      serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
      actionType: PROFILE_CARD_ACTION_PRODUCTS[action].actionType,
      profileAction: action,
      profileCardId: profile.id,
      profileId: profile.id,
      selectedProfileId: profile.id,
      costCoins: PROFILE_CARD_ACTION_COST_COINS,
      amountKrw: PROFILE_CARD_ACTION_COST_KRW,
      ...(paymentContext || {}),
    };
    const response = await authFetch(`${apiBase}/api/profile/${encodeURIComponent(profile.id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, {
      retryOn401: true,
      apiBase,
    });
    const payload = await safeParseJson<{ profiles?: DestinyProfile[]; currentId?: string; profile?: DestinyProfile }>(response);
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || `${profileActionProductName(action)}에 실패했습니다.`);

    const nextProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    const nextCurrentId = typeof payload.currentId === "string" ? payload.currentId : (nextProfiles[0]?.id || "");
    clearActiveDestinyProfileCache(profile.id);
    publishDestinyProfileList(nextProfiles, nextCurrentId);
    setProfiles(nextProfiles);
    setCurrentId(nextCurrentId);
    setCanCreateMore(true);
    emitDestinyProfileChanged(nextProfiles, nextCurrentId);
    await refreshProfileActionBalance();
  }, [apiBase, refreshProfileActionBalance]);

  const executeProfileCreateAction = useCallback(async (
    requestId: string,
    profileId: string,
    draft: ProfileCreateDraft,
    paymentContext: Record<string, unknown> | null,
  ) => {
    const profileName = draft.name.trim();
    const response = await authFetch(`${apiBase}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        productType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        serviceType: PROFILE_CARD_ACTION_SERVICE_TYPE,
        actionType: PROFILE_CARD_ACTION_PRODUCTS.create.actionType,
        profileAction: "create",
        profileCardId: profileId,
        profileId,
        selectedProfileId: profileId,
        costCoins: PROFILE_CARD_ACTION_COST_COINS,
        amountKrw: PROFILE_CARD_ACTION_COST_KRW,
        ...(paymentContext || {}),
        profile: {
          profileId,
          name: profileName,
          gender: draft.gender,
          birthDate: draft.birthDate,
          birthTime: draft.birthTime,
          birth: { calType: draft.calType },
          location: {
            label: draft.locationLabel.trim(),
            tz: draft.timezone.trim() || "Asia/Seoul",
            lng: Number(draft.longitude),
            lat: Number(draft.latitude),
          },
        },
      }),
    }, {
      retryOn401: true,
      apiBase,
    });

    const payload = await safeParseJson<ProfileStatePayload & { profile?: DestinyProfile; data?: DestinyProfile; code?: string }>(response);
    if (!response.ok || !payload?.ok) {
      const code = String(payload?.code || "").toUpperCase();
      if (response.status === 402 || code === "PAYMENT_REQUIRED" || code === "INSUFFICIENT_COINS" || code.startsWith("PROFILE_CREATE_")) {
        throw new Error("\uD504\uB85C\uD544 \uCE74\uB4DC \uCD94\uAC00\uB294 \uC774\uC6A9\uAD8C\uAC00 \uC5C6\uC73C\uBA74 50\uCF54\uC778 \uACB0\uC81C\uAC00 \ud544\uc694\ud569\uB2C8\uB2E4.");
      }
      throw new Error(payload?.message || "\uD504\uB85C\uD544 \uCE74\uB4DC \uCD94\uAC00 \uC2E4\uD328.");
    }

    applyProfilePayload(payload);
    await refreshProfileActionBalance();
    setIsCreateProfileOpen(false);
    setCreateDraft(buildCreateDraft());
  }, [apiBase, applyProfilePayload, refreshProfileActionBalance]);

  const runProfileActionFlow = useCallback(async (action: "delete", profile: DestinyProfile, paymentMethod?: ProfileActionPaymentMethod) => {
    if (busyAction) return;
    const requestId = buildProfileActionRequestId(action, profile.id);
    const requiresPayment = deleteRequiresProfileActionPayment;
    const selectedPaymentMethod = paymentMethod || (requiresPayment ? "card" : undefined);
    if (requiresPayment && selectedPaymentMethod === "monthly_stones" && !hasEnoughMonthlyStonesForProfileAction) {
      setAuthNotice(`월정석이 부족합니다. 프로필 카드 삭제에는 월정석 ${formatMonthlyStoneValue(PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST)}이 필요합니다. 단건결제로 진행하거나 월정석을 확보한 뒤 다시 시도해주세요.`);
      return;
    }
    setBusyAction(`${action}:${profile.id}`);
    try {
      let paymentContext: Record<string, unknown> | null = null;
      if (requiresPayment && selectedPaymentMethod === "card") {
        setProfileActionStage("payment");
        const payment = await runProfileActionCardPayment(action, profile, requestId);
        paymentContext = {
          accessGrant: payment.accessGrant || undefined,
          payment: payment.payment || undefined,
          merchantUid: payment.merchantUid,
          paymentId: payment.paymentId,
          paymentMethod: "single_purchase",
          paymentMode: "single_purchase",
          accessMethod: "single_purchase",
        };
      } else if (requiresPayment) {
        setProfileActionStage("coin");
        paymentContext = {
          paymentMethod: "membership_credit",
          paymentMode: "membership_credit",
          accessMethod: "membership_credit",
        };
      }
      setProfileActionStage(action === "delete" ? "deleting" : "saving");
      await executeProfileAction(action, profile, requestId, paymentContext);
      setAuthNotice(action === "delete" ? "프로필 카드가 삭제되었습니다." : `${profileActionProductName(action)}이 완료되었습니다.`);
      if (action === "delete") setDeleteTarget(null);
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : `${profileActionProductName(action)} \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.`);
    } finally {
      setBusyAction("");
      setProfileActionStage("");
    }
  }, [busyAction, deleteRequiresProfileActionPayment, executeProfileAction, hasEnoughMonthlyStonesForProfileAction, runProfileActionCardPayment]);

  const openCreateProfile = () => {
    setActiveProfileMenuId("");
    setCreateDraft(buildCreateDraft());
    setIsCreateProfileOpen(true);
    setAuthNotice("");
  };

  const createProfile = useCallback(async (paymentMethod?: ProfileActionPaymentMethod) => {
    if (busyAction) return;
    const name = createDraft.name.trim();
    if (!name || !createDraft.birthDate || !createDraft.birthTime || !createDraft.locationLabel.trim()) {
      setAuthNotice("입력값이 충분하지 않습니다.");
      return;
    }

    const draft = { ...createDraft, name };
    const profileId = buildNewProfileId();
    const requestId = buildProfileActionRequestId("create", profileId);
    const requiresPayment = createRequiresProfileActionPayment;
    const selectedPaymentMethod = paymentMethod || (hasEnoughMonthlyStonesForProfileAction ? "monthly_stones" : "card");

    if (requiresPayment && selectedPaymentMethod === "monthly_stones" && !hasEnoughMonthlyStonesForProfileAction) {
      setAuthNotice(`월정석이 부족합니다. 프로필 카드 작업에는 월정석 ${formatMonthlyStoneValue(PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST)}이 필요합니다. 단건결제로 진행하거나 월정석을 확보한 뒤 다시 시도해주세요.`);
      return;
    }

    setBusyAction("create");
    try {
      let paymentContext: Record<string, unknown> | null = null;
      const actionProfile = { id: profileId } as DestinyProfile;

      if (requiresPayment && selectedPaymentMethod === "card") {
        setProfileActionStage("payment");
        const payment = await runProfileActionCardPayment("create", actionProfile, requestId);
        paymentContext = {
          accessGrant: payment.accessGrant || undefined,
          payment: payment.payment || undefined,
          merchantUid: payment.merchantUid,
          paymentId: payment.paymentId,
          paymentMethod: "single_purchase",
          paymentMode: "single_purchase",
          accessMethod: "single_purchase",
        };
      } else if (requiresPayment) {
        setProfileActionStage("coin");
        paymentContext = {
          paymentMethod: "membership_credit",
          paymentMode: "membership_credit",
          accessMethod: "membership_credit",
        };
      }

      setProfileActionStage("saving");

      await executeProfileCreateAction(requestId, profileId, draft, paymentContext);
      setAuthNotice("새 프로필 카드가 추가되었습니다.");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : mePageText("mePage.003"));
    } finally {
      setBusyAction("");
      setProfileActionStage("");
    }
  }, [busyAction, createDraft, createRequiresProfileActionPayment, executeProfileCreateAction, hasEnoughMonthlyStonesForProfileAction, runProfileActionCardPayment]);
  const deleteProfile = async (profileId: string) => {
    setActiveProfileMenuId("");
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      setAuthNotice("삭제할 프로필 카드를 찾을 수 없습니다.");
      return;
    }
    setDeleteTarget(profile);
    setAuthNotice("");
  };

  const handleAddProfileClick = () => {
    openCreateProfile();
  };

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    clearProfileState();
    try {
      await logout(apiBase);
    } finally {
      window.location.replace("/");
    }
  };

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-[color:var(--cd-page-bg,#0f1224)] px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl text-sm text-slate-300">{"\uB0B4 \uC6B4\uBA85 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[color:var(--cd-page-bg,#0f1224)] px-4 py-8 text-slate-100">
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span>{authNotice}</span>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="shrink-0 rounded-md border border-amber-300/50 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-400/25"
            >
              {"다시 시도"}
            </button>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">프로필 슬롯</p>
            <p className="mt-1 text-xl font-bold text-white">{profiles.length}/{profileLimitLabel}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-amber-300" style={{ width: `${slotPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{planLabel(subscription.tier)}</p>
          </div>
          <div className="rounded-lg border border-amber-300/20 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">현재 이용권</p>
                <p className="mt-1 text-xl font-bold text-white">{planLabel(subscription.tier)}</p>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
                자동결제 아님
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
              <p>시작일 <span className="font-semibold text-white">{subscriptionStartedAtLabel}</span></p>
              <p>만료일 <span className="font-semibold text-white">{subscriptionExpiresAtLabel}</span></p>
              <p>남은 일수 <span className="font-semibold text-white">{subscriptionDaysLeftLabel}</span></p>
              <p>혜택 <span className="font-semibold text-white">{subscriptionBenefitLabel}</span></p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/terms#refund-policy" className="font-semibold text-amber-200 underline-offset-4 hover:underline">환불 요청 안내</Link>
              <Link href="/points/history" className="font-semibold text-sky-200 underline-offset-4 hover:underline">과거 결제 내역</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article ref={activeProfileCardRef} className="rounded-lg border border-amber-300/20 bg-[linear-gradient(145deg,rgba(25,28,58,0.98),rgba(42,30,70,0.96))] p-5 shadow-2xl shadow-black/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Active Card</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{currentProfile?.name || "선택된 프로필 카드가 없습니다."}</h2>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                대표 프로필
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">이용권 혜택</p>
                    <p className="mt-0.5 text-xl font-black tracking-tight text-amber-100">{monthlyStoneBalanceLabel}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">프로필 카드 관리와 프리미엄 기능에 사용할 수 있는 이용권 혜택입니다.</p>
                  </div>
                </div>
                <Link href="/points" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,0.34)] transition-transform hover:-translate-y-0.5">{"\uC774\uC6A9\uAD8C \uAD00\uB9AC"}</Link>
              </div>
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
                아직 프로필 카드가 없습니다. 새 프로필을 추가해 운명의 기준점을 세워 주세요.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddProfileClick}
                className={`rounded-md px-4 py-2 text-sm font-bold ${canCreateMore ? "bg-amber-300 text-slate-950" : "border border-amber-300/40 bg-amber-500/10 text-amber-100"}`}
              >
                새 프로필 추가
              </button>
              <Link href="/" className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">
                메인으로 이동
              </Link>
            </div>
          </article>

          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Profile List</p>
                <h2 className="mt-1 text-lg font-bold text-white">프로필 목록</h2>
              </div>
              <button
                type="button"
                onClick={openCreateProfile}
                className="rounded-md border border-amber-300/35 px-3 py-2 text-xs font-semibold text-amber-100"
              >
                새 프로필 추가
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {profiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-300">
                  저장된 프로필 카드가 없습니다. 새 프로필을 추가해 주세요.
                </div>
              ) : (
                profiles.map((profile) => {
                  const active = profile.id === currentId;
                  const activating = busyAction === `activate:${profile.id}`;
                  const viewing = viewingProfileLoadingId === profile.id;
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
                          {active ? <span className="mt-1 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-slate-950">대표</span> : null}
                          <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label={mePageText("mePage.004")}
                            onClick={(event) => {
                              if (busyAction) {
                                return;
                              }
                              event.preventDefault();
                              event.stopPropagation();
                              setActiveProfileMenuId((prev) => prev === profile.id ? "" : profile.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") return;
                              if (busyAction) {
                                return;
                              }
                              event.preventDefault();
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
                                disabled={viewing || activating || deleting || (!!busyAction && !activating)}
                                className="flex min-h-[44px] w-full touch-manipulation items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-40"
                              >
                                <span>{mePageText("mePage.005")}</span>
                                <span className="text-xs text-slate-400">{viewing ? "..." : ""}</span>
                              </button>
                              {!active ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void activateProfile(profile);
                                  }}
                                  disabled={viewing || activating || deleting || (!!busyAction && !activating)}
                                  className="flex min-h-[44px] w-full touch-manipulation items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-amber-100 hover:bg-amber-300/10 disabled:opacity-40"
                                >
                                  <span>대표로 선택</span>
                                  <span className="text-xs text-slate-400">{activating ? "..." : ""}</span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openCreateProfile();
                                }}
                                disabled={deleting || activating || !!busyAction}
                                className="flex min-h-[44px] w-full touch-manipulation items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-amber-100 hover:bg-amber-300/10 disabled:opacity-40"
                              >
                                새 프로필 추가
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteProfile(profile.id);
                                }}
                                disabled={deleting || activating || !!busyAction}
                                className="flex min-h-[44px] w-full touch-manipulation items-center rounded-md px-3 py-2 text-left text-sm font-bold text-rose-100 hover:bg-rose-500/15 disabled:opacity-40"
                              >
                                {deleting ? profileActionProgressLabel("delete", profileActionStage) : profileActionButtonLabel("delete")}
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
      </div>

      {viewingProfile ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby="profileViewTitle">
          <div className="w-full max-w-md rounded-t-2xl border border-sky-200/30 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 id="profileViewTitle" className="text-lg font-bold text-sky-100">프로필 카드 조회</h3>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="truncate text-base font-bold text-white">{viewingProfile.name}</p>
              <p className="mt-1 text-xs text-slate-300">{viewingProfile.isActive || viewingProfile.id === currentId ? "현재 선택된 프로필" : "저장된 프로필"}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/18 p-3">
                <p className="text-xs text-slate-400">생년월일시</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatProfileBirth(viewingProfile)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/18 p-3">
                <p className="text-xs text-slate-400">성별</p>
                <p className="mt-1 text-sm font-semibold text-white">{viewingProfile.gender === "M" ? "남성" : viewingProfile.gender === "F" ? "여성" : "기타"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/18 p-3">
                <p className="text-xs text-slate-400">출생지</p>
                <p className="mt-1 text-sm font-semibold text-white">{viewingProfile.location?.label || "미입력"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/18 p-3">
                <p className="text-xs text-slate-400">생성일</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatArchiveDate(viewingProfile.createdAt || "")}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="min-h-[44px] rounded-md bg-sky-200 px-4 py-2 text-sm font-bold text-slate-950"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateProfileOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-amber-300/35 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 className="text-lg font-bold text-amber-100">새 프로필 추가</h3>
            <p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
              {isFamilyProfilePlan
                ? "Code Destiny Family 이용권으로 새 프로필 카드를 제한 없이 추가할 수 있습니다."
                : canCreateInitialProfileForFree
                ? "첫 프로필 카드는 이용권 없이 결제 없이 만들 수 있습니다."
                : createRequiresProfileActionPayment
                ? "새 프로필 카드를 추가하려면 5,000원 단건결제 또는 월정석 사용이 필요합니다."
                : "이용권 슬롯 안에서 새 프로필 카드를 추가할 수 있습니다."}
            </p>
            {busyAction === "create" ? (
              <div className="mt-3 rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
                프로필을 저장하는 중입니다.
              </div>
            ) : null}
            {authNotice ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-200">
                {authNotice}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-300">
                이름/별칭
                <input
                  value={createDraft.name}
                  onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  성별
                  <select
                    value={createDraft.gender}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, gender: event.target.value as ProfileCreateDraft["gender"] }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  >
                    <option value="OTHER">{mePageText("mePage.006")}</option>
                    <option value="M">{mePageText("mePage.007")}</option>
                    <option value="F">{mePageText("mePage.008")}</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  양력/음력
                  <select
                    value={createDraft.calType}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, calType: event.target.value as ProfileCreateDraft["calType"] }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  >
                    <option value="solar">{mePageText("mePage.009")}</option>
                    <option value="lunar">{mePageText("mePage.010")}</option>
                    <option value="lunar_leap">{mePageText("mePage.011")}</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  생년월일
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="YYYYMMDD"
                    value={formatBirthDateDigits(createDraft.birthDate)}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, birthDate: normalizeBirthDateFromDigits(event.target.value) }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  출생시간
                  <input
                    type="time"
                    value={createDraft.birthTime}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, birthTime: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-xs font-semibold text-slate-300">
                출생지
                <input
                  value={createDraft.locationLabel}
                  onChange={(event) => setCreateDraft((prev) => ({ ...prev, locationLabel: event.target.value }))}
                  placeholder={mePageText("mePage.012")}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  경도
                  <input
                    inputMode="decimal"
                    value={createDraft.longitude}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, longitude: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  위도
                  <input
                    inputMode="decimal"
                    value={createDraft.latitude}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, latitude: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-300">
                  시간대
                  <input
                    value={createDraft.timezone}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                    className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70"
                  />
                </label>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsCreateProfileOpen(false)}
                disabled={!!busyAction}
                className="min-h-[44px] rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-45"
              >
                취소
              </button>
              {createRequiresProfileActionPayment ? (
                <>
                  <button
                    type="button"
                    onClick={() => void createProfile("monthly_stones")}
                    disabled={!createDraft.name.trim() || !createDraft.birthDate || !createDraft.birthTime || !createDraft.locationLabel.trim() || !!busyAction}
                    className="min-h-[44px] rounded-md border border-amber-300/45 px-3 py-2 text-sm font-bold text-amber-100 disabled:opacity-45"
                  >
                    {busyAction === "create" && profileActionStage === "coin" ? profileActionProgressLabel("create", profileActionStage) : profileActionPrimaryLabel("create", "monthly_stones")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void createProfile("card")}
                    disabled={!createDraft.name.trim() || !createDraft.birthDate || !createDraft.birthTime || !createDraft.locationLabel.trim() || !!busyAction}
                    className="min-h-[44px] rounded-md bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-45"
                  >
                    {busyAction === "create" && profileActionStage === "payment" ? profileActionProgressLabel("create", profileActionStage) : profileActionPrimaryLabel("create", "card")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void createProfile()}
                  disabled={!createDraft.name.trim() || !createDraft.birthDate || !createDraft.birthTime || !createDraft.locationLabel.trim() || !!busyAction}
                  className="min-h-[44px] rounded-md bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-45"
                >
                  {busyAction === "create" ? "저장 중" : "프로필 추가"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/75 px-0 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-rose-300/35 bg-[#171a34]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-xl">
            <h3 className="text-lg font-bold text-rose-100">프로필 삭제 확인</h3>
            <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
              {isFamilyProfilePlan
                ? "Code Destiny Family 이용권으로 프로필 카드를 결제 없이 삭제할 수 있습니다."
                : "프로필 카드 삭제는 5,000원 기준 결제로 진행됩니다."}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              프로필 카드를 삭제할까요?
              <br />
              {isFamilyProfilePlan ? (
                "삭제하면 해당 프로필 카드의 저장 정보가 사라집니다."
              ) : (
                <>
                  단건결제 또는 월정석 {formatMonthlyStoneValue(PROFILE_CARD_ACTION_MEMBERSHIP_CREDIT_COST)} 사용 중 하나를 선택해 주세요.
                  <br />
                  삭제 후에는 해당 프로필 카드의 저장 정보가 사라집니다.
                </>
              )}
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
              {deleteRequiresProfileActionPayment ? (
              <>
                <button
                  type="button"
                  onClick={() => void runProfileActionFlow("delete", deleteTarget, "monthly_stones")}
                  disabled={!!busyAction}
                  className="min-h-[44px] rounded-md border border-rose-300/45 px-3 py-2 text-sm font-bold text-rose-100 disabled:opacity-45"
                >
                  {busyAction === `delete:${deleteTarget.id}` && profileActionStage === "coin" ? profileActionProgressLabel("delete", profileActionStage) : profileActionPrimaryLabel("delete", "monthly_stones")}
                </button>
                <button
                  type="button"
                  onClick={() => void runProfileActionFlow("delete", deleteTarget, "card")}
                  disabled={!!busyAction}
                  className="min-h-[44px] rounded-md bg-rose-400 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-rose-950/30 disabled:opacity-45"
                >
                  {busyAction === `delete:${deleteTarget.id}` && profileActionStage === "payment" ? profileActionProgressLabel("delete", profileActionStage) : profileActionPrimaryLabel("delete", "card")}
                </button>
              </>
              ) : (
                <button
                  type="button"
                  onClick={() => void runProfileActionFlow("delete", deleteTarget)}
                  disabled={!!busyAction}
                  className="min-h-[44px] rounded-md bg-rose-400 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-rose-950/30 disabled:opacity-45"
                >
                  {busyAction === `delete:${deleteTarget.id}` ? "삭제 중" : "프로필 삭제"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-amber-300/35 bg-[#171a34] p-5 shadow-2xl shadow-black/40">
            <h3 className="text-lg font-bold text-amber-100">프로필 한도를 확인해 주세요</h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              현재 이용권 한도에 따라 새 프로필 추가가 제한될 수 있습니다. 원화 단건결제를 진행하거나 상위 이용권으로 전환한 뒤 다시 시도해 주세요.
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
                이용권 관리로 이동
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
