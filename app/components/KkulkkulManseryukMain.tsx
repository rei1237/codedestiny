"use client";

import { useEffect, useState, useRef } from "react";
import HPremiumNamingSection from "./HPremiumNamingSection";
import { showToast } from "./Toast";
import { isSubscriptionIncludedResponse, showSubscriptionIncludedNotice } from "./subscriptionNotice";
import { usePayment } from "../hooks/usePayment";
import { persistSanitizedAuthUser } from "../_lib/auth-storage";
import { authFetch } from "../_lib/auth-client";
import { openPaidFeatureGate, purchaseFeature } from "../_lib/billing-client";
import { resolveMonthlyStoneBalance } from "../_lib/monthly-stone";
import EmailSubscriptionSection from "./EmailSubscriptionSection";

type LockedSectionProps = {
  title: string;
  description: string;
  cost: number;
  isUnlocked: boolean;
  onUnlock: () => void;
  buttonLabel?: string;
  children: React.ReactNode;
};

function formatCoinValue(amount: number) {
  return `${Math.max(0, Math.floor(Number(amount || 0) * 100)).toLocaleString("ko-KR")}원`;
}

function formatMonthlyCreditValue(amount: number | null) {
  return `${Math.max(0, Math.floor(Number(amount || 0) * 10)).toLocaleString("ko-KR")}원 상당`;
}

function LockedSection({
  title,
  description,
  cost,
  isUnlocked,
  onUnlock,
  buttonLabel = "이용권 혜택으로 운명 확인하기",
  children,
}: LockedSectionProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const bootstrapBalanceSyncInFlight = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartPos.current.x;
    const dy = e.touches[0].clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setIsScrolling(true);
    }
  };

  const wrapClick = (cb: () => void) => (e: React.MouseEvent) => {
    if (isScrolling) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    cb();
  };

  if (isUnlocked) {
    return (
      <section
        className="relative overflow-hidden rounded-3xl border border-amber-400 bg-gradient-to-br from-white to-amber-50 p-5 shadow-xl shadow-amber-100/50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="absolute -right-8 -top-8 h-20 w-20 rotate-12 bg-amber-400/20" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-neutral-900">{title}</h3>
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
               해금됨 
            </span>
          </div>
          <div className="h-6 w-6 text-amber-500">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
        </div>
        <p className="mt-1 text-sm font-medium text-neutral-600">{description}</p>
        <div className="mt-4 rounded-2xl border border-amber-200/50 bg-white/80 p-4 shadow-inner">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-amber-300/60 bg-white/80 p-5 shadow-lg shadow-rose-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <h3 className="text-lg font-extrabold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>

      {/* 결제 전 유료 데이터는 렌더링하지 않고 미리보기 더미만 표시 */}
      <div className="mt-3 rounded-2xl border border-amber-100 bg-rose-50/80 p-4 text-neutral-500 blur-[10px] grayscale-[50%] select-none pointer-events-none">
        <p className="font-semibold">잠금된 프리미엄 운명 데이터</p>
        <p className="mt-1 text-sm">이용권 혜택 또는 원화 단건 결제 후 상세 결과가 열립니다.</p>
      </div>

      <div className="absolute inset-0 grid place-items-center bg-white/20 backdrop-blur-[10px]">
        <div className="rounded-2xl border border-amber-300/80 bg-white/95 px-6 py-5 text-center shadow-xl">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 p-2 shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-amber-900" aria-hidden="true">
              <path
                d="M8 10V7a4 4 0 118 0v3M7 10h10a1 1 0 011 1v8a1 1 0 01-1 1H7a1 1 0 01-1-1v-8a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-neutral-800">유료 기능 잠금 상태</p>
          <p className="mb-3 text-xs font-bold text-amber-700">필요 원화 가치: {cost}</p>
          <button
            type="button"
            onClick={wrapClick(onUnlock)}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

type UnlockKey =
  | "allPaidSaju"
  | "rpgCharacter"
  | "travelDestiny"
  | "healthReport"
  | "sajuDiary"
  | "secretHouseEpisodes"
  | "premiumDivinationPack";

type PerUseKey = "turtleIChing" | "egyptOracle" | "geomancy" | "stonehengeRunes" | "premiumTarot" | "loveSimulation";
type PremiumServiceKey = "ziwei" | "astrology" | "sukuyo" | "veda" | "naming";
type PremiumFlowStage = "intro" | "generate";
type VedaPaymentFlowState = "idle" | "checking_access" | "access_granted" | "payment_required" | "generating_report" | "success" | "error";

const PREMIUM_SERVICE_COST: Record<PremiumServiceKey, number> = {
  ziwei: 590,
  astrology: 390,
  sukuyo: 390,
  veda: 390,
  naming: 700,
};

const PREMIUM_SERVICE_LABEL: Record<PremiumServiceKey, string> = {
  ziwei: "자미두수 프리미엄 리포트",
  astrology: "점성술 프리미엄 리포트",
  sukuyo: "숙요점 프리미엄 리포트",
  veda: "베다 점성술 프리미엄 리포트",
  naming: "명운 작명 프리미엄 리포트",
};

const PREMIUM_SERVICE_FEATURE_KEY: Record<PremiumServiceKey, string> = {
  ziwei: "removed-premium-feature",
  astrology: "removed-premium-feature",
  sukuyo: "removed-premium-feature",
  veda: "removed-premium-feature",
  naming: "premium-naming-report",
};

const UNLOCK_PRODUCT_BY_KEY: Record<UnlockKey, string> = {
  allPaidSaju: "unlock.all_paid_saju",
  rpgCharacter: "unlock.rpg_character",
  travelDestiny: "unlock.travel_destiny",
  healthReport: "unlock.health_report",
  sajuDiary: "unlock.saju_diary",
  secretHouseEpisodes: "unlock.secret_house_episodes",
  premiumDivinationPack: "unlock.premium_divination_pack",
};

const PER_USE_DESTINATION: Partial<Record<PerUseKey, string>> = {
  turtleIChing: "/index.html?action=openJuyukModal",
  egyptOracle: "/index.html?action=openKemetModal",
  geomancy: "/geomancy-oracle-v4.html",
  stonehengeRunes: "/oracle/rune?entry=per-use",
  premiumTarot: "/index.html?action=openTarotModal",
  loveSimulation: "/saju/love-simulation",
};

const PREMIUM_ZIWEI_UNLOCK_MARKER_KEY = "premium:ziwei:unlock:v1";
const LEGACY_TILE_LOCK_KEY = "cd_tile_locks";
const TILE_LOCK_PREFIX = "cd_tile_locks_v2::";
const PREMIUM_ZIWEI_UNLOCK_ALIASES = [
  "premium-ziwei",
  "ziwei-deep",
  "unlock.premium_ziwei",
  "premiumDivinationPack",
  "premium-divination-pack",
  "unlock.premium_divination_pack",
];

const FREE_FEATURES = [
  "기본 만세력: 연/월/일/시 명식표 + 일주 캐릭터 요약",
  "재미 콘텐츠: 매력 테스트, 로또 기능",
  "데일리: 타짜 화투점, 데스티니 포커, 오늘/이달 운세 키워드, 돼지 주석점, 영국 홍차점",
  "맛보기: MBTI 동물 궁합, 사주네컷, 최강 T발놈 테스트",
  "사주 AI 프롬프트 맛보기: 이상형 얼굴, 운명적 풍경, 사주 아바타",
  "행복한 회복 타로",
];

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const EMPTY_UNLOCK_STATE: Record<UnlockKey, boolean> = {
  allPaidSaju: false,
  rpgCharacter: false,
  travelDestiny: false,
  healthReport: false,
  sajuDiary: false,
  secretHouseEpisodes: false,
  premiumDivinationPack: false,
};
const UNLOCK_KEY_ALIASES: Record<UnlockKey, string[]> = {
  allPaidSaju: ["allPaidSaju", "all-paid-saju"],
  rpgCharacter: ["rpgCharacter", "rpg-character"],
  travelDestiny: ["travelDestiny", "travel-destiny"],
  healthReport: ["healthReport", "health-report"],
  sajuDiary: ["sajuDiary", "saju-diary"],
  secretHouseEpisodes: ["secretHouseEpisodes", "secret-house-episodes"],
  premiumDivinationPack: [
    "premiumDivinationPack",
    "premium-divination-pack",
    "premium-ziwei",
    "premium-astrology",
    "premium-sukuyo",
    "premium-veda",
    "premium-naming",
  ],
};

function buildUnlockStateFromPayload(payload: any): Record<UnlockKey, boolean> {
  const merged = new Set<string>();

  if (payload && Array.isArray(payload.unlockedFeatures)) {
    payload.unlockedFeatures.forEach((value: unknown) => merged.add(String(value || "").trim()));
  }
  if (payload && payload.user && Array.isArray(payload.user.unlockedFeatures)) {
    payload.user.unlockedFeatures.forEach((value: unknown) => merged.add(String(value || "").trim()));
  }
  if (payload && payload.unlockMap && typeof payload.unlockMap === "object") {
    Object.keys(payload.unlockMap).forEach((key) => {
      if (payload.unlockMap[key] === true) merged.add(String(key || "").trim());
    });
  }

  const next: Record<UnlockKey, boolean> = { ...EMPTY_UNLOCK_STATE };
  (Object.keys(UNLOCK_KEY_ALIASES) as UnlockKey[]).forEach((key) => {
    next[key] = UNLOCK_KEY_ALIASES[key].some((alias) => merged.has(alias));
  });
  if (next.allPaidSaju) {
    next.rpgCharacter = true;
    next.travelDestiny = true;
    next.healthReport = true;
    next.sajuDiary = true;
    next.secretHouseEpisodes = true;
  }
  return next;
}

function hasFlowerAdminPasswordSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return String(sessionStorage.getItem('flower_admin_password_ok') || '') === '1';
  } catch (_) {
    return false;
  }
}

function isAdminSessionClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (!hasFlowerAdminPasswordSession()) return false;
  try {
    const token = String(sessionStorage.getItem('flower_admin_token') || '');
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch (_) {}
  try {
    const token = String(localStorage.getItem('flower_admin_token') || '');
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch (_) {}
  return false;
}

function getFlowerAdminTokenClient(): string {
  if (typeof window === 'undefined') return '';
  if (!hasFlowerAdminPasswordSession()) return '';
  try {
    const token = sessionStorage.getItem('flower_admin_token');
    if (token && FLOWER_ADMIN_TOKEN_RE.test(String(token))) return String(token);
  } catch (_) {}
  try {
    const token = localStorage.getItem('flower_admin_token');
    if (token && FLOWER_ADMIN_TOKEN_RE.test(String(token))) return String(token);
  } catch (_) {}
  return '';
}

function getFlowerAdminTestTierClient(): '' | 'standard' | 'premium' | 'vvip' {
  if (typeof window === 'undefined') return '';
  const raw = String(localStorage.getItem('flower_admin_test_tier') || '').toLowerCase();
  if (raw === 'standard' || raw === 'premium' || raw === 'vvip') return raw;
  return '';
}

function getClientAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return String(localStorage.getItem('fortune_auth_token') || '').trim();
  } catch (_) {
    return '';
  }
}

function isLikelyUsableJwt(token: string): boolean {
  const raw = String(token || '').trim();
  if (!raw) return false;
  const parts = raw.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const exp = Number(payload?.exp);
    if (Number.isFinite(exp) && exp > 0 && (Date.now() + 15_000) >= exp * 1000) return false;
  } catch (_) {
    return false;
  }
  return true;
}

function getUsableClientAuthToken(): string {
  const token = getClientAuthToken();
  if (!token) return '';
  if (isLikelyUsableJwt(token)) return token;
  try {
    localStorage.removeItem('fortune_auth_token');
  } catch (_) {}
  return '';
}

function hasCachedAuthIdentity(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('fortune_auth_user');
    if (!raw) return false;
    const user = JSON.parse(raw);
    const id = String(user?.id || user?.userId || user?._id || user?.uid || '').trim();
    const email = String(user?.email || '').trim();
    return !!(id || email);
  } catch (_) {
    return false;
  }
}

function hasAuthRoleCookie(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return /(?:^|;\s*)fortune_auth_role=/.test(document.cookie || '');
  } catch (_) {
    return false;
  }
}

function hasClientAuthSessionHint(): boolean {
  if (isAdminSessionClient()) return true;
  if (getUsableClientAuthToken()) return true;
  if (hasAuthRoleCookie()) return true;
  if (hasCachedAuthIdentity()) return true;
  return false;
}

function buildClientAuthHeaders(): Record<string, string> {
  const token = getUsableClientAuthToken();
  const adminToken = getFlowerAdminTokenClient();
  const adminTestTier = getFlowerAdminTestTierClient();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(adminToken ? { 'x-admin-token': adminToken } : {}),
    ...(adminToken && adminTestTier ? { 'x-admin-subscription-tier': adminTestTier } : {}),
  };
}

function isLoginRequiredResponse(status: number, payload: any): boolean {
  const nestedErrorCode = payload?.error && typeof payload.error === "object"
    ? String(payload.error.code || "")
    : "";
  const code = String(payload?.code || nestedErrorCode || payload?.error || '').trim().toUpperCase();
  return status === 401 || code === 'UNAUTHORIZED' || code === 'AUTH_REQUIRED' || code === 'LOGIN_REQUIRED';
}

function unwrapBillingPayload(payload: any) {
  if (payload && payload.ok === true && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}

function extractCoinLikePayload(payload: any) {
  const normalized = unwrapBillingPayload(payload);
  if (!normalized || typeof normalized !== "object") return {};
  if (normalized.consume && typeof normalized.consume === "object") {
    return {
      ...normalized.consume,
      user: normalized.user || normalized.consume.user || null,
      balance: normalized.balance ?? normalized.consume.balance ?? normalized.consume?.user?.points,
      chargedCoins: normalized.consume.chargedCoins ?? 0,
      subscriptionTier: normalized.consume.subscriptionTier,
      freeBySubscription: normalized.consume.freeBySubscription,
      transactionId: normalized.consume.transactionId,
      message: normalized.message || normalized.consume.message,
    };
  }
  return normalized;
}

function redirectToLoginWithNext(nextPath: string = '/'): void {
  if (typeof window === 'undefined') return;
  window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstFiniteNonNegative(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue >= 0) return Math.floor(numberValue);
  }
  return null;
}

function extractBillingSnapshot(payload: any) {
  const normalized = unwrapBillingPayload(payload);
  const consume = readRecord(normalized?.consume);
  const user = readRecord(normalized?.user);
  const membership = readRecord(normalized?.membership);
  const profileSubscription = readRecord(user?.profileSubscription);
  const balance = firstFiniteNonNegative(normalized?.balance, consume?.balance, user?.points);
  const monthlyStoneBalance = normalized?.authenticated === false
    ? 0
    : resolveMonthlyStoneBalance(normalized, consume, membership, user, profileSubscription);
  return { normalized, balance, monthlyStoneBalance };
}

function isCoinSpendPayload(payload: any): boolean {
  const normalized = unwrapBillingPayload(payload);
  const consume = readRecord(normalized?.consume) || readRecord(normalized) || {};
  const accessType = String(consume.accessType || normalized?.accessType || "").trim().toLowerCase();
  const accessMethod = String(consume.accessMethod || normalized?.accessMethod || "").trim().toUpperCase();
  const paymentMethod = String(consume.paymentMethod || normalized?.paymentMethod || "").trim().toUpperCase();
  const transactionType = String(consume.transactionType || normalized?.transactionType || "").trim().toLowerCase();
  return accessType === "coin" || accessMethod === "COIN" || paymentMethod === "COIN" || transactionType === "coin";
}

function isMonthlyCreditPayload(payload: any): boolean {
  const normalized = unwrapBillingPayload(payload);
  const consume = readRecord(normalized?.consume) || readRecord(normalized) || {};
  const accessType = String(consume.accessType || normalized?.accessType || "").trim().toLowerCase();
  const accessMethod = String(consume.accessMethod || normalized?.accessMethod || "").trim().toUpperCase();
  const paymentMethod = String(consume.paymentMethod || normalized?.paymentMethod || "").trim().toUpperCase();
  return accessType === "membership_credit" || accessMethod === "MONTHLY" || paymentMethod === "MONTHLY";
}

function saveUserBillingSnapshot(points: number | null | undefined, monthlyStoneBalance: number | null | undefined) {
  try {
    const raw = localStorage.getItem('fortune_auth_user');
    const user = raw ? JSON.parse(raw) : {};
    if (points !== null && points !== undefined && Number.isFinite(Number(points)) && Number(points) >= 0) {
      user.points = Math.floor(Number(points));
    }
    if (monthlyStoneBalance !== null && monthlyStoneBalance !== undefined && Number.isFinite(Number(monthlyStoneBalance)) && Number(monthlyStoneBalance) >= 0) {
      const credits = Math.floor(Number(monthlyStoneBalance));
      user.monthlyStoneBalance = credits;
      user.profileSubscription = {
        ...(user.profileSubscription && typeof user.profileSubscription === "object" ? user.profileSubscription : {}),
        monthlyStoneBalance: credits,
        membershipCreditBalance: credits,
      };
    }
    persistSanitizedAuthUser(user);
  } catch (_) {}
}

function getAuthScopeFromStorage(): string {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return String(user?.id || user?.userId || user?._id || user?.uid || "").trim().toLowerCase();
  } catch (_) {
    return "";
  }
}

function readBooleanMapStorage(storageKey: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, boolean> = {};
    Object.keys(parsed).forEach((key) => {
      if ((parsed as Record<string, unknown>)[key] === true) {
        result[key] = true;
      }
    });
    return result;
  } catch (_) {
    return {};
  }
}

function markZiweiPremiumUnlockedClient() {
  try {
    const marker = JSON.stringify({ unlocked: true, updatedAt: Date.now() });
    localStorage.setItem(PREMIUM_ZIWEI_UNLOCK_MARKER_KEY, marker);
    sessionStorage.setItem(PREMIUM_ZIWEI_UNLOCK_MARKER_KEY, marker);
  } catch (_) {}

  try {
    const legacy = readBooleanMapStorage(LEGACY_TILE_LOCK_KEY);
    PREMIUM_ZIWEI_UNLOCK_ALIASES.forEach((alias) => {
      legacy[alias] = true;
    });
    localStorage.setItem(LEGACY_TILE_LOCK_KEY, JSON.stringify(legacy));
  } catch (_) {}

  try {
    const scope = getAuthScopeFromStorage();
    if (!scope) return;
    const scopedKey = `${TILE_LOCK_PREFIX}${scope}`;
    const scoped = readBooleanMapStorage(scopedKey);
    PREMIUM_ZIWEI_UNLOCK_ALIASES.forEach((alias) => {
      scoped[alias] = true;
    });
    localStorage.setItem(scopedKey, JSON.stringify(scoped));
  } catch (_) {}

  try {
    window.dispatchEvent(new CustomEvent("cd:tile-locks-updated"));
  } catch (_) {}
}

function notifyCoinDeducted(cost: number, points: number, label: string) {
  showToast(`${label} 이용권 확인이 완료되었습니다. ${formatCoinValue(cost)} 결제가 승인되었습니다.`, "info");
}

function notifyCoinResult(data: any, fallbackCost: number, points: number, label: string) {
  const normalized = extractCoinLikePayload(data);
  const chargedCoins = Number(normalized?.chargedCoins ?? fallbackCost);
  if (isMonthlyCreditPayload(normalized)) {
    const snapshot = extractBillingSnapshot(normalized);
    const usedCredits = firstFiniteNonNegative(normalized?.membershipCreditCost, normalized?.requiredMonthlyCredits);
    const details = [
      usedCredits !== null ? `${formatMonthlyCreditValue(usedCredits)} 사용` : "",
      snapshot.monthlyStoneBalance !== null ? `남은 이용권 혜택: ${formatMonthlyCreditValue(snapshot.monthlyStoneBalance)}` : "",
    ].filter(Boolean);
    showToast(`${label} 이용권 혜택으로 열렸습니다.${details.length ? ` ${details.join(" · ")}` : ""}`, "info");
    return;
  }
  if (isSubscriptionIncludedResponse(normalized, chargedCoins)) {
    showSubscriptionIncludedNotice({
      message: String(normalized?.message || data?.message || "이용권 혜택 범위에 포함되어 바로 이용할 수 있습니다."),
      reason: label,
      tier: String(normalized?.subscriptionTier || ""),
    });
    return;
  }
  if (chargedCoins > 0) {
    notifyCoinDeducted(chargedCoins, points, label);
  }
}

function redirectPerUseFeature(key: PerUseKey) {
  const destination = PER_USE_DESTINATION[key];
  if (!destination) return;
  window.location.href = destination;
}
export default function KkulkkulManseryukMain() {
  const { isPaymentLoading, startPayment, endPayment, setPaymentMessage } = usePayment();
  const [currentCoins, setCurrentCoins] = useState(0);
  const [currentMonthlyStoneBalance, setCurrentMonthlyStoneBalance] = useState(0);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [globalRuntimeError, setGlobalRuntimeError] = useState("");
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [sparkleTarget, setSparkleTarget] = useState<string | null>(null);
  const [openPremSection, setOpenPremSection] = useState<string | null>(null);
  const [premiumCollectionOpen, setPremiumCollectionOpen] = useState(true);
  const [premiumFlowStage, setPremiumFlowStage] = useState<PremiumFlowStage>("intro");
  const [premiumGateLoading, setPremiumGateLoading] = useState<PremiumServiceKey | null>(null);
  const [premiumGateError, setPremiumGateError] = useState("");
  const [vedaFlowState, setVedaFlowState] = useState<VedaPaymentFlowState>("idle");
  const [vedaFlowError, setVedaFlowError] = useState("");
  const [unlockedFeatures, setUnlockedFeatures] = useState<Record<UnlockKey, boolean>>({ ...EMPTY_UNLOCK_STATE });
  const bootstrapBalanceSyncInFlight = useRef(false);
  const bootstrapBalanceAbortRef = useRef<AbortController | null>(null);
  const rechargeModalVisible = showRechargeModal || (openPremSection === 'veda' && vedaFlowState === 'payment_required');

  const [perUseCount, setPerUseCount] = useState<Record<PerUseKey, number>>({
    turtleIChing: 0,
    egyptOracle: 0,
    geomancy: 0,
    stonehengeRunes: 0,
    premiumTarot: 0,
    loveSimulation: 0,
  });

  const unlockingRef = useRef(false);

  const applyBillingSnapshot = (payload: any, options: { fallbackCoins?: number; updateUnlocks?: boolean } = {}) => {
    const snapshot = extractBillingSnapshot(payload);
    const fallbackCoins = Number(options.fallbackCoins);
    const nextCoins = snapshot.balance !== null
      ? snapshot.balance
      : (Number.isFinite(fallbackCoins) && fallbackCoins >= 0 ? Math.floor(fallbackCoins) : null);
    if (nextCoins !== null) {
      setCurrentCoins(nextCoins);
      saveUserBillingSnapshot(nextCoins, snapshot.monthlyStoneBalance);
    } else if (snapshot.monthlyStoneBalance !== null) {
      saveUserBillingSnapshot(null, snapshot.monthlyStoneBalance);
    }
    if (snapshot.monthlyStoneBalance !== null) {
      setCurrentMonthlyStoneBalance(snapshot.monthlyStoneBalance);
    }
    if (options.updateUnlocks === true) {
      const restored = buildUnlockStateFromPayload(snapshot.normalized);
      setUnlockedFeatures((prev) => ({
        ...prev,
        ...restored,
      }));
    }
    return {
      ...snapshot,
      points: nextCoins,
    };
  };

  const unlockByCoins = async (key: UnlockKey, cost: number, alsoUnlock?: UnlockKey[]) => {
    if (unlockedFeatures[key]) return;
    if (isPaymentLoading || unlockingRef.current) return;
    unlockingRef.current = true;

    startPayment("이용 권한 확인 중입니다...");
    try {
      const productId = UNLOCK_PRODUCT_BY_KEY[key];
      const requestId = `unlock:${productId || key}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9);
      const payload = {
        featureKey: key,
        reason: `${key} 해금`,
        forceDeduct: true,
        requestId,
        ...(productId ? { productId } : { cost }),
      };

      const purchaseResult = await purchaseFeature(payload);
      if (!purchaseResult.ok && isLoginRequiredResponse(purchaseResult.status, purchaseResult.raw)) {
        alert('로그인이 필요합니다. 로그인 후 다시 시도해 주세요.');
        redirectToLoginWithNext('/');
        return;
      }
      if (!purchaseResult.ok && purchaseResult.status === 402) {
        applyBillingSnapshot(purchaseResult.raw, { fallbackCoins: currentCoins });
        setShowRechargeModal(true);
        return;
      }
      if (!purchaseResult.ok) { alert(purchaseResult.error?.message || purchaseResult.message || '이용권 확인 실패'); return; }

      const normalized: Record<string, unknown> & {
        user: Record<string, unknown> | null;
        balance: number | null | undefined;
        transactionId?: unknown;
      } = {
        ...(purchaseResult.data?.consume && typeof purchaseResult.data.consume === 'object' ? purchaseResult.data.consume : {}),
        user: purchaseResult.data?.user || null,
        balance: purchaseResult.data?.balance,
        monthlyStoneBalance: purchaseResult.data?.monthlyStoneBalance,
        membershipCreditBalance: purchaseResult.data?.membershipCreditBalance,
        monthlyCredits: purchaseResult.data?.monthlyCredits,
      };
      const fallbackCoins = isCoinSpendPayload(normalized) ? Math.max(0, currentCoins - cost) : currentCoins;
      const snapshot = applyBillingSnapshot({
        ...(purchaseResult.data || {}),
        consume: normalized,
        user: normalized.user,
        balance: normalized.balance,
      }, { fallbackCoins });
      const newPoints = snapshot.points ?? currentCoins;
      notifyCoinResult(normalized, cost, newPoints, key);
      setUnlockedFeatures((prev) => {
        const next = { ...prev, [key]: true };
        if (alsoUnlock?.length) {
          for (const aliasKey of alsoUnlock) next[aliasKey] = true;
        }
        return next;
      });
      setSparkleTarget(key);
      setPaymentMessage("이용 권한 확인이 완료되었습니다. 결과를 열고 있습니다...");
      await new Promise(r => setTimeout(r, 1000));
      showToast(`🎉 이용 준비가 완료되었습니다! 바로 확인해 보세요.`, "success");
    } catch (e) {
      console.error('[unlockByCoins]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      unlockingRef.current = false;
      endPayment();
    }
  };

  const runPaidFeatureOnce = async (key: PerUseKey, cost: number) => {
    if (key === "stonehengeRunes") {
      redirectPerUseFeature(key);
      return;
    }

    if (isPaymentLoading || unlockingRef.current) return;
    unlockingRef.current = true;

    startPayment("운명 콘텐츠를 여는 중입니다...");
    try {
      const purchaseResult = await purchaseFeature({
        featureKey: key,
        reason: `${key} 이용`,
        forceDeduct: true,
        requestId: `use:${key}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9),
      });
      if (!purchaseResult.ok && isLoginRequiredResponse(purchaseResult.status, purchaseResult.raw)) {
        alert('로그인이 필요합니다. 로그인 후 다시 시도해 주세요.');
        redirectToLoginWithNext('/');
        return;
      }
      if (!purchaseResult.ok && purchaseResult.status === 402) {
        applyBillingSnapshot(purchaseResult.raw, { fallbackCoins: currentCoins });
        setShowRechargeModal(true);
        return;
      }
      if (!purchaseResult.ok) { alert(purchaseResult.error?.message || purchaseResult.message || '이용권 확인 실패'); return; }

      const normalized: Record<string, unknown> & {
        user: Record<string, unknown> | null;
        balance: number | null | undefined;
        transactionId?: unknown;
      } = {
        ...(purchaseResult.data?.consume && typeof purchaseResult.data.consume === 'object' ? purchaseResult.data.consume : {}),
        user: purchaseResult.data?.user || null,
        balance: purchaseResult.data?.balance,
        monthlyStoneBalance: purchaseResult.data?.monthlyStoneBalance,
        membershipCreditBalance: purchaseResult.data?.membershipCreditBalance,
        monthlyCredits: purchaseResult.data?.monthlyCredits,
      };
      const fallbackCoins = isCoinSpendPayload(normalized) ? Math.max(0, currentCoins - cost) : currentCoins;
      const snapshot = applyBillingSnapshot({
        ...(purchaseResult.data || {}),
        consume: normalized,
        user: normalized.user,
        balance: normalized.balance,
      }, { fallbackCoins });
      const newPoints = snapshot.points ?? currentCoins;
      notifyCoinResult(normalized, cost, newPoints, key);
      setPerUseCount((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      setSparkleTarget(key);
      showToast(`✨ 운명 확인 결제가 승인되었습니다. 잠시 후 결과가 열립니다.`, "success");
      redirectPerUseFeature(key);
    } catch (e) {
      console.error('[runPaidFeatureOnce]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      unlockingRef.current = false;
      endPayment();
    }
  };

  const [isScrolling, setIsScrolling] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartPos.current.x;
    const dy = e.touches[0].clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setIsScrolling(true);
    }
  };

  const wrapClick = (cb: () => void) => (e: React.MouseEvent) => {
    if (isScrolling) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    cb();
  };

  const handleOpenPremSection = (key: PremiumServiceKey) => {
    if (openPremSection === key) {
      setOpenPremSection(null);
      setPremiumFlowStage('intro');
      setPremiumGateError('');
      if (key === 'veda') {
        setVedaFlowState('idle');
        setVedaFlowError('');
      }
      return;
    }
    setOpenPremSection(key);
    setPremiumFlowStage('intro');
    setPremiumGateError('');
    if (key === 'veda') {
      setVedaFlowState('idle');
      setVedaFlowError('');
    }
    setTimeout(() => {
      document.getElementById('prem-active-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleStartPremiumGeneration = async (service: PremiumServiceKey) => {
    if (premiumGateLoading) return;

    setPremiumGateError('');
    if (service === 'veda') {
      setVedaFlowError('');
      setVedaFlowState('checking_access');
    }
    const cost = PREMIUM_SERVICE_COST[service];
    const featureKey = PREMIUM_SERVICE_FEATURE_KEY[service];
    const requestId = `premium:${featureKey || service}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9);
    openPaidFeatureGate({
      featureKey,
      requestId,
      cost,
      message: "이용권 확인 중",
    });
    setPremiumGateLoading(service);
    try {
      const purchaseResult = await purchaseFeature({
        featureKey,
        reason: `${PREMIUM_SERVICE_LABEL[service]} 생성`,
        forceDeduct: true,
        requestId,
      });
      if (!purchaseResult.ok && isLoginRequiredResponse(purchaseResult.status, purchaseResult.raw)) {
        if (service === 'veda') {
          setVedaFlowState('idle');
        }
        alert('로그인이 필요합니다. 로그인 후 다시 시도해 주세요.');
        redirectToLoginWithNext('/');
        return;
      }
      if (!purchaseResult.ok && purchaseResult.status === 402) {
        applyBillingSnapshot(purchaseResult.raw, { fallbackCoins: currentCoins });
        if (service === 'veda') {
          setVedaFlowState('payment_required');
          setVedaFlowError(purchaseResult.error?.message || '단건 결제가 필요합니다.');
        } else {
          setShowRechargeModal(true);
        }
        return;
      }
      if (!purchaseResult.ok) {
        const message = purchaseResult.error?.message || purchaseResult.message || '이용권 확인 실패';
        setPremiumGateError(message);
        if (service === 'veda') {
          setVedaFlowState('error');
          setVedaFlowError(message);
        }
        return;
      }

      const consumePayload = purchaseResult.data?.consume && typeof purchaseResult.data.consume === 'object'
        ? purchaseResult.data.consume
        : null;
      const coinGateConfirmed = purchaseResult.status === 200
        && !!consumePayload
        && (consumePayload as Record<string, unknown>).ok !== false;
      if (!coinGateConfirmed) {
        const message = '이용권 또는 단건 결제 확인에 실패하여 생성을 시작하지 않았습니다. 다시 시도해 주세요.';
        setPremiumGateError(message);
        if (service === 'veda') {
          setVedaFlowState('error');
          setVedaFlowError(message);
        }
        return;
      }

      const normalized: Record<string, unknown> & {
        user: Record<string, unknown> | null;
        balance: number | null | undefined;
        transactionId?: unknown;
      } = {
        ...(consumePayload || {}),
        user: purchaseResult.data?.user || null,
        balance: purchaseResult.data?.balance,
        monthlyStoneBalance: purchaseResult.data?.monthlyStoneBalance,
        membershipCreditBalance: purchaseResult.data?.membershipCreditBalance,
        monthlyCredits: purchaseResult.data?.monthlyCredits,
      };
      const txId = normalized?.transactionId || purchaseResult.raw?.transactionId;
      if (txId) {
        try { sessionStorage.setItem(`cd_premium_tx_${service}`, String(txId)); } catch (_) {}
      }
      const fallbackCoins = isCoinSpendPayload(normalized) ? Math.max(0, currentCoins - cost) : currentCoins;
      const snapshot = applyBillingSnapshot({
        ...(purchaseResult.data || {}),
        consume: normalized,
        user: normalized.user,
        balance: normalized.balance,
      }, { fallbackCoins });
      const newPoints = snapshot.points ?? currentCoins;
      notifyCoinResult(normalized, cost, newPoints, PREMIUM_SERVICE_LABEL[service]);
      if (service === "ziwei") {
        markZiweiPremiumUnlockedClient();
      }
      await new Promise(r => setTimeout(r, 800));
      if (service === 'veda') {
        setVedaFlowState('generating_report');
      }
      setPremiumFlowStage('generate');
    } catch (e) {
      console.error('[handleStartPremiumGeneration]', e);
      const message = '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      setPremiumGateError(message);
      if (service === 'veda') {
        setVedaFlowState('error');
        setVedaFlowError(message);
      }
    } finally {
      setPremiumGateLoading(null);
    }
  };

  useEffect(() => {
    if (!sparkleTarget) return;
    const timer = setTimeout(() => setSparkleTarget(null), 1100);
    return () => clearTimeout(timer);
  }, [sparkleTarget]);

  useEffect(() => {
    // Keep touch listeners passive so premium card taps never compete with scroll gestures.
    const onTouchPassive = () => {};
    window.addEventListener('touchstart', onTouchPassive, { passive: true });
    window.addEventListener('touchmove', onTouchPassive, { passive: true });
    window.addEventListener('touchend', onTouchPassive, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchPassive);
      window.removeEventListener('touchmove', onTouchPassive);
      window.removeEventListener('touchend', onTouchPassive);
    };
  }, []);

  useEffect(() => {
    const onGlobalError = (event: ErrorEvent) => {
      console.error('[KkulkkulManseryukMain][error]', event.error || event.message);
      setGlobalRuntimeError('일시적 오류가 감지되었습니다. 기능은 계속 사용하실 수 있습니다.');
      setTimeout(() => setGlobalRuntimeError(''), 3500);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[KkulkkulManseryukMain][unhandledrejection]', event.reason);
      setGlobalRuntimeError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setTimeout(() => setGlobalRuntimeError(''), 3500);
    };
    window.addEventListener('error', onGlobalError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onGlobalError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const syncBalanceFromSession = (options: { forceProbe?: boolean } = {}) => {
      try {
        const raw = localStorage.getItem('fortune_auth_user');
        const user = raw ? JSON.parse(raw) : {};
        const admin = isAdminSessionClient();
        setIsAdminUser(admin);
        const cachedPoints = Number(user?.points);
        if (Number.isFinite(cachedPoints) && cachedPoints >= 0) {
          setCurrentCoins(cachedPoints);
        }
      } catch (_) {}

      const forceProbe = options.forceProbe === true;
      if (!forceProbe && !hasClientAuthSessionHint() && !isAdminSessionClient()) return;
      if (bootstrapBalanceSyncInFlight.current) return;

      const controller = new AbortController();
      bootstrapBalanceAbortRef.current?.abort();
      bootstrapBalanceAbortRef.current = controller;
      bootstrapBalanceSyncInFlight.current = true;

      const authHeaders = buildClientAuthHeaders();
      authFetch('/api/billing/balance', {
        method: 'GET',
        cache: 'no-store',
        headers: { ...authHeaders },
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) {
            if (r.status === 401 || r.status === 403) {
              setIsAdminUser(false);
            }
            return null;
          }
          return r.json().catch(() => ({}));
        })
        .then((d) => {
          if (!d) return;
          const normalized = unwrapBillingPayload(d);
          applyBillingSnapshot(normalized, { updateUnlocks: true });
        })
        .catch(() => {})
        .finally(() => {
          if (bootstrapBalanceAbortRef.current === controller) {
            bootstrapBalanceAbortRef.current = null;
          }
          bootstrapBalanceSyncInFlight.current = false;
        });
    };

    syncBalanceFromSession();

    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: unknown }>).detail;
      const changedEvent = String(detail?.event || '').trim().toLowerCase();
      syncBalanceFromSession({ forceProbe: changedEvent === 'login' || changedEvent === 'logout' });
    };
    const onStorage = (event: StorageEvent) => {
      const key = String(event?.key || '').trim();
      if (!key) return;
      if (
        key === 'fortune_auth_token'
        || key === 'fortune_auth_user'
        || key === 'fortune_auth_role'
        || key === 'flower_admin_token'
      ) {
        syncBalanceFromSession();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncBalanceFromSession();
      }
    };
    const onBillingBalanceUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      applyBillingSnapshot(detail, { updateUnlocks: true });
    };
    window.addEventListener('cd:auth-changed', onAuthChanged as EventListener);
    window.addEventListener('cd:billing-balance-updated', onBillingBalanceUpdated as EventListener);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        channel.onmessage = (event) => {
          const data = (event?.data || {}) as { event?: unknown };
          const changedEvent = String(data?.event || '').trim().toLowerCase();
          syncBalanceFromSession({ forceProbe: changedEvent === 'login' || changedEvent === 'logout' });
        };
      }
    } catch (_) {
      channel = null;
    }

    return () => {
      window.removeEventListener('cd:auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('cd:billing-balance-updated', onBillingBalanceUpdated as EventListener);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      channel?.close();
      bootstrapBalanceAbortRef.current?.abort();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-100 via-pink-50 to-amber-100 px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          {globalRuntimeError ? (
            <p className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              ⚠ {globalRuntimeError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-700">꿀꿀 만세력</p>
              <h1 className="mt-2 text-3xl font-black leading-tight">달빛 운세 이용권</h1>
              <p className="mt-2 text-sm text-neutral-700">
                무료는 즉시 노출, 유료는 이용권 혜택 또는 원화 단건 결제로 개별 해금합니다. 결제 전에는 데이터가 노출되지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-amber-800">콘텐츠 가치 단위</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-extrabold text-amber-900">
                <span aria-hidden="true">🌙</span>
                <span>원화 기준 가치로 표시</span>
              </p>
              <div className="mt-2 grid gap-1 text-xs font-bold text-amber-900/80">
                <span>보유 원화 가치: {formatCoinValue(currentCoins)}</span>
                <span>이용권 혜택: {formatMonthlyCreditValue(currentMonthlyStoneBalance)}</span>
              </div>
            </div>
          </div>
        </header>

        <EmailSubscriptionSection />

        {/* FREE: 바로 노출되는 영역 */}
        <section className="rounded-3xl border border-emerald-200 bg-white/90 p-5 shadow-sm">
          <h2 className="text-xl font-black text-emerald-800">FREE - 바로 노출</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {FREE_FEATURES.map((feature) => (
              <article key={feature} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-900">{feature}</p>
              </article>
            ))}
          </div>
        </section>

        {/* PAID: 무료 외 전체 사주 해금 번들 */}
        <LockedSection
          title="사주 확장 콘텐츠 전체 해금"
          description="무료 항목을 제외한 사주 확장 서비스 전체를 한 번에 해금합니다."
          cost={700}
          isUnlocked={unlockedFeatures.allPaidSaju}
          onUnlock={() =>
            unlockByCoins("allPaidSaju", 700, ["rpgCharacter", "travelDestiny", "healthReport", "sajuDiary", "secretHouseEpisodes"])
          }
        >
          <p className="text-sm text-neutral-700">
            해금 완료: 사주 확장 세트(심층 풀이/확장 재미 콘텐츠/개별 리포트)가 모두 열렸습니다.
          </p>
        </LockedSection>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* PAID 개별 해금 */}
          <LockedSection
            title="RPG 캐릭터 리포트"
            description="사주 기반 능력치/직업/성장 루트를 RPG 캐릭터처럼 분석합니다."
            cost={30}
            isUnlocked={unlockedFeatures.rpgCharacter || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("rpgCharacter", 30)}
          >
            <p className="text-sm text-neutral-700">전투 타입, 성장 타입, 파티 궁합이 공개되었습니다.</p>
          </LockedSection>

          <LockedSection
            title="사주로 보는 여행지"
            description="사주 에너지와 시기 흐름을 기준으로 운이 맞는 여행지와 피해야 할 타이밍을 제안합니다."
            cost={50}
            isUnlocked={unlockedFeatures.travelDestiny || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("travelDestiny", 50)}
          >
            <p className="text-sm text-neutral-700">당신의 운을 살리는 여행지 3곳과 피해야 할 시즌이 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="명리 헬스 리포트"
            description="오행 균형과 생활 패턴을 바탕으로 건강 리스크와 관리 루틴을 안내합니다."
            cost={100}
            isUnlocked={unlockedFeatures.healthReport || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("healthReport", 100)}
          >
            <p className="text-sm text-neutral-700">체질 관리 포인트와 일상 루틴 추천이 활성화되었습니다.</p>
          </LockedSection>

          <LockedSection
            title="사주 다이어리"
            description="운세 흐름 기록 템플릿과 월간 회고를 통해 내 패턴을 추적하는 다이어리 기능입니다."
            cost={100}
            isUnlocked={unlockedFeatures.sajuDiary || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("sajuDiary", 100)}
          >
            <p className="text-sm text-neutral-700">오늘 기록 템플릿과 월간 리포트 생성이 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="시크릿 하우스 전체 에피소드"
            description="잠금된 스토리 루트, 멀티 엔딩, 확장 에피소드를 전체 해금합니다."
            cost={50}
            isUnlocked={unlockedFeatures.secretHouseEpisodes || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("secretHouseEpisodes", 50)}
          >
            <p className="text-sm text-neutral-700">모든 에피소드/멀티 엔딩/숨겨진 루트가 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="프리미엄 점술 패키지"
            description="자미두수·점성술·숙요·베다 심층 해석 리포트 묶음을 한 번에 이용할 수 있는 패키지입니다."
            cost={300}
            isUnlocked={unlockedFeatures.premiumDivinationPack}
            onUnlock={() => unlockByCoins("premiumDivinationPack", 300)}
          >
            <ul className="list-disc pl-5 text-sm text-neutral-700">
              <li>자미두수 전체 풀이</li>
              <li>점성술 세부 차트</li>
              <li>숙요점 심층 분석</li>
              <li>베다점 심화 리포트</li>
            </ul>
          </LockedSection>
        </section>

        {/* PAID 회당 과금 섹션 */}
        <section className="rounded-3xl border border-rose-200 bg-white/90 p-5 shadow-sm">
          <h2 className="text-xl font-black text-rose-800">회당 과금 점술 (서버 가격표 기준)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            주역·이집트·지오맨시는 이용할 때마다 권한을 확인하고, 스톤헨지 룬점은 배열 선택 후 1룬/3룬/5룬/12룬 단계별 가치 기준이 적용됩니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "turtleIChing" as const, title: "주역 거북점", cost: 30, note: "1회 3,000원" },
              { key: "egyptOracle" as const, title: "이집트 신탁", cost: 30, note: "1회 3,000원" },
              { key: "geomancy" as const, title: "지오맨시 흙점", cost: 50, note: "1회 5,000원" },
              { key: "stonehengeRunes" as const, title: "스톤헨지 룬점", cost: 0, note: "배열별 3,000원/5,000원/7,000원/12,000원" },
              { key: "premiumTarot" as const, title: "프리미엄 타로(회복 타로 제외)", cost: 100, note: "1회 10,000원" },
            ].map((item) => (
              <article
                key={item.key}
                className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4"
              >
                <h3 className="font-bold text-neutral-900">{item.title}</h3>
                <p className="mt-1 text-xs font-bold text-rose-700">{item.note}</p>
                <p className="mt-1 text-xs text-neutral-600">이용 횟수: {perUseCount[item.key]}회</p>

                <button
                  type="button"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onClick={wrapClick(() => runPaidFeatureOnce(item.key, item.cost))}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  {item.key === "stonehengeRunes" ? "배열 고르고 이용권으로 열기" : "이용권 혜택으로 운명 확인하기"}
                </button>

                {perUseCount[item.key] > 0 ? (
                  <div className="mt-3 rounded-xl border border-emerald-400/50 bg-emerald-50 px-3 py-2.5 shadow-sm">
                    <p className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">✓</span>
                      운명이 해독되었습니다!
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-600">결과 데이터가 하단에 활성화되었습니다.</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-white/40 p-2.5 text-center text-[11px] font-medium text-neutral-400 blur-[4px] grayscale-[50%] select-none">
                    결제 전에는 데이터가 비노출됩니다.
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <p className="text-xs text-neutral-600">
          정책 요약: 무료로 지정된 항목 외 기능은 유료이며, 결제 전에는 실제 콘텐츠를 렌더링하지 않습니다.
        </p>

        <section
          style={{
            background:
              "radial-gradient(ellipse at 20% 10%, rgba(180,140,30,0.13) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(160,110,20,0.11) 0%, transparent 50%), linear-gradient(160deg, #0a0a0a 0%, #111008 40%, #0d0b00 70%, #050505 100%)",
            border: "1px solid rgba(212,175,55,0.38)",
            borderRadius: "22px",
            boxShadow:
              "0 0 0 1px rgba(212,175,55,0.12), 0 30px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,215,80,0.12)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={wrapClick(() => setPremiumCollectionOpen((prev) => !prev))}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "linear-gradient(180deg, rgba(30,24,4,0.55) 0%, rgba(10,8,0,0.25) 100%)",
              color: "#f5e7b2",
              cursor: "pointer",
              padding: "18px 16px 16px",
              borderBottom: premiumCollectionOpen ? "1px solid rgba(212,175,55,0.22)" : "none",
            }}
            aria-expanded={premiumCollectionOpen}
            aria-label="VVIP 프리미엄 컬렉션 열기/닫기"
          >
            <div style={{ fontSize: "0.66rem", fontWeight: 900, letterSpacing: "0.18em", color: "#d4af37" }}>
              VVIP · PREMIUM COLLECTION
            </div>
            <div style={{ marginTop: 5, fontSize: "1.08rem", fontWeight: 900, color: "#fff3c1" }}>
              프리미엄 운명 분석 컬렉션
            </div>
            <div style={{ marginTop: 6, fontSize: "0.78rem", color: "rgba(240,220,150,0.78)" }}>
              자미두수 · 점성술 · 숙요점 · 베다 · 명운 작명
            </div>
            <div style={{ marginTop: 8, fontSize: "0.82rem", color: "#d4af37", fontWeight: 800 }}>
              {premiumCollectionOpen ? "▲ 컬렉션 접기" : "▼ 컬렉션 열기"}
            </div>
          </button>

          {premiumCollectionOpen ? (
            <div style={{ display: "grid", gap: 14, padding: "14px" }}>
        {/* ─── 1. 자미두수 프리미엄 ─── */}
        {premiumGateError ? (
          <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            ⚠ {premiumGateError}
          </p>
        ) : null}

        {/* ─── 5. 명운 작명 프리미엄 ─── */}
        <div style={{
          background: "linear-gradient(145deg, rgb(8,12,24) 0%, rgb(26,20,8) 100%)",
          border: "1.5px solid rgba(212,175,55,0.38)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(212,175,55,0.12)",
          position: "relative",
          zIndex: 20,
          pointerEvents: "auto",
        }}>
          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={wrapClick(() => handleOpenPremSection('naming'))}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/naming.webp" alt="명운 작명 프리미엄"
                width={520}
                height={390}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgb(8,12,24))" }} />
              <span style={{
                position: "absolute", top: "8px", left: "8px",
                background: "rgba(212,175,55,0.95)", color: "#0f172a",
                fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.14em",
                padding: "2px 7px", borderRadius: "20px", textTransform: "uppercase",
              }}>PREMIUM</span>
            </div>
            <div style={{ flex: 1, padding: "16px 16px 16px 4px" }}>
              <p style={{ color: "rgba(245,226,122,0.75)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 4px" }}>명운 · Naming Premium</p>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: "0 0 6px", lineHeight: 1.3 }}>사주 프리미엄 작명</p>
              <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>70,000원 · 만세력 엔진 연동 · 용신/오행/수리 작명 리포트</p>
              <span style={{
                display: "inline-block",
                background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.12))",
                border: "1px solid rgba(212,175,55,0.55)",
                color: "rgba(245,226,122,1)", fontWeight: 700, fontSize: "0.7rem",
                padding: "5px 13px", borderRadius: "10px",
              }}>{openPremSection === 'naming' ? '▲ 접기' : '✦ 소개 보기'}</span>
            </div>
          </button>
          {openPremSection === 'naming' && (
            <div id="prem-active-section" style={{ borderTop: "1px solid rgba(212,175,55,0.22)" }}>
              <HPremiumNamingSection
                showIntro={premiumFlowStage === 'intro'}
                onStartGeneration={() => handleStartPremiumGeneration('naming')}
                generationLoading={premiumGateLoading === 'naming'}
              />
            </div>
          )}
        </div>
            </div>
          ) : null}
        </section>
      </div>

      {sparkleTarget ? (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {Array.from({ length: 24 }).map((_, idx) => (
            <span
              key={`sparkle-${sparkleTarget}-${idx}`}
              className="absolute text-lg font-black text-amber-500 animate-bounce"
              style={{
                left: `${(idx % 8) * 12 + 4}%`,
                top: `${Math.floor(idx / 8) * 28 + 12}%`,
                animationDelay: `${(idx % 6) * 60}ms`,
              }}
            >
              ✨
            </span>
          ))}
        </div>
      ) : null}

      {rechargeModalVisible ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-rose-300 bg-white p-6 text-center shadow-2xl">
            <p className="text-2xl">🐷💰</p>
            <p className="mt-2 text-lg font-black text-neutral-900">이 기능은 유료 결제가 필요해요.</p>
            <p className="mt-2 text-sm text-neutral-600">결제 페이지에서 상품을 선택하면 바로 이용할 수 있어요.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRechargeModal(false);
                  if (openPremSection === 'veda') {
                    setVedaFlowState('idle');
                  }
                  window.location.href = '/points';
                }}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                결제 페이지로 이동
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRechargeModal(false);
                  if (openPremSection === 'veda' && vedaFlowState === 'payment_required') {
                    setVedaFlowState('idle');
                  }
                }}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
