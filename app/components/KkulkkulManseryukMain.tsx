"use client";

import { useEffect, useState, useRef } from "react";
import HPremiumSukuyoSection from "./HPremiumSukuyoSection";
import HPremiumAstrologySection from "./HPremiumAstrologySection";
import HPremiumVedicSection from "./HPremiumVedicSection";
import HPremiumNamingSection from "./HPremiumNamingSection";
import { showToast } from "./Toast";
import { isSubscriptionIncludedResponse, showSubscriptionIncludedNotice } from "./subscriptionNotice";
import HPremiumZiweiBookSection from "./HPremiumZiweiBookSection";
import { usePayment } from "../hooks/usePayment";
import { persistSanitizedAuthUser } from "../_lib/auth-storage";
import { authFetch } from "../_lib/auth-client";
import { purchaseFeature } from "../_lib/billing-client";
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

function LockedSection({
  title,
  description,
  cost,
  isUnlocked,
  onUnlock,
  buttonLabel = "꽃돼지 코인으로 운명 확인하기",
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
        <p className="mt-1 text-sm">코인 결제 후 상세 결과가 열립니다.</p>
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
          <p className="mb-3 text-xs font-bold text-amber-700">소모 코인: {cost}</p>
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
type VedaPaymentFlowState = "idle" | "checking_access" | "access_granted" | "payment_required" | "generating_pdf" | "success" | "error";
type PremiumGateResult = {
  ok: boolean;
  reason?: "login-required" | "payment-required" | "error";
  message?: string;
};

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
  ziwei: "premium_pdf_ziwei",
  astrology: "premium_pdf_western_astrology",
  sukuyo: "premium_pdf_sukyo",
  veda: "premium_pdf_vedic",
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

function saveUserPoints(points: number) {
  try {
    const raw = localStorage.getItem('fortune_auth_user');
    const user = raw ? JSON.parse(raw) : {};
    user.points = points;
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
  showToast(`🪙 ${label} 이용으로 ${cost}코인이 차감되었습니다. 남은 코인: ${Number(points).toLocaleString("ko-KR")}`, "info");
}

function notifyCoinResult(data: any, fallbackCost: number, points: number, label: string) {
  const normalized = extractCoinLikePayload(data);
  const chargedCoins = Number(normalized?.chargedCoins ?? fallbackCost);
  if (isSubscriptionIncludedResponse(normalized, chargedCoins)) {
    showSubscriptionIncludedNotice({
      message: String(normalized?.message || data?.message || "구독 혜택이 적용되어 코인이 차감되지 않았습니다."),
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
  const { startPayment, endPayment, setPaymentMessage } = usePayment();
  const [currentCoins, setCurrentCoins] = useState(0);
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

  async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await authFetch(url, {
        ...init,
        credentials: init.credentials || 'include',
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } finally {
      clearTimeout(timer);
    }
  }

  const unlockByCoins = async (key: UnlockKey, cost: number, alsoUnlock?: UnlockKey[]) => {
    if (unlockedFeatures[key]) return;

    startPayment(`결제를 진행 중입니다.`);
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
      if (!purchaseResult.ok && purchaseResult.status === 402) { setShowRechargeModal(true); return; }
      if (!purchaseResult.ok) { alert(purchaseResult.error?.message || purchaseResult.message || '코인 차감 실패'); return; }

      const normalized: Record<string, unknown> & {
        user: Record<string, unknown> | null;
        balance: number | null | undefined;
        transactionId?: unknown;
      } = {
        ...(purchaseResult.data?.consume && typeof purchaseResult.data.consume === 'object' ? purchaseResult.data.consume : {}),
        user: purchaseResult.data?.user || null,
        balance: purchaseResult.data?.balance,
      };
      const newPoints = normalized?.user?.points !== undefined
        ? Number(normalized.user.points)
        : (Number.isFinite(Number(normalized?.balance)) ? Number(normalized.balance) : Math.max(0, currentCoins - cost));
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      notifyCoinResult(normalized, cost, newPoints, key);
      setUnlockedFeatures((prev) => {
        const next = { ...prev, [key]: true };
        if (alsoUnlock?.length) {
          for (const aliasKey of alsoUnlock) next[aliasKey] = true;
        }
        return next;
      });
      setSparkleTarget(key);
      setPaymentMessage("✅ 성공적으로 해금되었습니다!");
      await new Promise(r => setTimeout(r, 1000));
      showToast(`🎉 해금이 완료되었습니다! 바로 확인해 보세요.`, "success");
    } catch (e) {
      console.error('[unlockByCoins]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      endPayment();
    }
  };

  const handleVedaPdfFlowStateChange = (state: "generating_pdf" | "success" | "error", message?: string) => {
    if (openPremSection !== 'veda') return;
    setVedaFlowState(state);
    if (state === 'error' && message) {
      setVedaFlowError(message);
    }
    if (state === 'success') {
      setVedaFlowError('');
    }
  };

  const runPaidFeatureOnce = async (key: PerUseKey, cost: number) => {
    if (key === "stonehengeRunes") {
      redirectPerUseFeature(key);
      return;
    }

    startPayment(`결제를 진행 중입니다.`);
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
      if (!purchaseResult.ok && purchaseResult.status === 402) { setShowRechargeModal(true); return; }
      if (!purchaseResult.ok) { alert(purchaseResult.error?.message || purchaseResult.message || '코인 차감 실패'); return; }

      const normalized: Record<string, unknown> & {
        user: Record<string, unknown> | null;
        balance: number | null | undefined;
        transactionId?: unknown;
      } = {
        ...(purchaseResult.data?.consume && typeof purchaseResult.data.consume === 'object' ? purchaseResult.data.consume : {}),
        user: purchaseResult.data?.user || null,
        balance: purchaseResult.data?.balance,
      };
      const newPoints = normalized?.user?.points !== undefined
        ? Number(normalized.user.points)
        : (Number.isFinite(Number(normalized?.balance)) ? Number(normalized.balance) : Math.max(0, currentCoins - cost));
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      notifyCoinResult(normalized, cost, newPoints, key);
      setPerUseCount((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      setSparkleTarget(key);
      showToast(`✨ 운명 확인을 위해 코인이 사용되었습니다. 잠시 후 결과가 열립니다.`, "success");
      redirectPerUseFeature(key);
    } catch (e) {
      console.error('[runPaidFeatureOnce]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      endPayment();
    }
  };

  const runPremiumIntroGate = async (service: PremiumServiceKey): Promise<PremiumGateResult> => {
    const authHeaders = buildClientAuthHeaders();
    try {
      const { res, data } = await fetchJsonWithTimeout('/api/billing/me', {
        method: 'GET',
        headers: { ...authHeaders },
      });
      if (isLoginRequiredResponse(res.status, data)) {
        return { ok: false, reason: 'login-required', message: '로그인이 필요합니다.' };
      }
      if (!res.ok) {
        throw new Error(data?.message || '잔액 확인에 실패했습니다.');
      }

      const normalized = unwrapBillingPayload(data);
      const points = Number(normalized?.balance ?? normalized?.user?.points ?? currentCoins ?? 0);
      setCurrentCoins(points);
      saveUserPoints(points);

      const required = PREMIUM_SERVICE_COST[service] ?? 0;
      if (points < required) {
        return { ok: false, reason: 'payment-required', message: '코인이 부족합니다.' };
      }

      return { ok: true };
    } catch (error) {
      console.error('[runPremiumIntroGate]', error);
      const message = '코인/권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      setPremiumGateError(message);
      return { ok: false, reason: 'error', message };
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
    const gate = await runPremiumIntroGate(service);
    if (!gate.ok) {
      if (gate.reason === 'payment-required') {
        if (service === 'veda') {
          setVedaFlowState('payment_required');
          setVedaFlowError(gate.message || '코인이 부족합니다.');
        } else {
          setShowRechargeModal(true);
        }
      } else if (gate.reason === 'error') {
        if (service === 'veda') {
          setVedaFlowState('error');
          setVedaFlowError(gate.message || '코인/권한 확인 중 오류가 발생했습니다.');
        }
      } else if (service === 'veda') {
        setVedaFlowState('idle');
      }
      return;
    }

    if (service === 'veda') {
      setVedaFlowState('access_granted');
    }

    const cost = PREMIUM_SERVICE_COST[service];
    const featureKey = PREMIUM_SERVICE_FEATURE_KEY[service];
    const requestId = `premium:${featureKey || service}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9);
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
        if (service === 'veda') {
          setVedaFlowState('payment_required');
          setVedaFlowError(purchaseResult.error?.message || '코인이 부족합니다.');
        } else {
          setShowRechargeModal(true);
        }
        return;
      }
      if (!purchaseResult.ok) {
        const message = purchaseResult.error?.message || purchaseResult.message || '코인 차감 실패';
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
        const message = '코인 결제 확인에 실패하여 생성을 시작하지 않았습니다. 다시 시도해 주세요.';
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
      };
      const txId = normalized?.transactionId || purchaseResult.raw?.transactionId;
      if (txId) {
        try { sessionStorage.setItem(`cd_premium_tx_${service}`, String(txId)); } catch (_) {}
      }
      const newPoints = normalized?.user?.points !== undefined
        ? Number(normalized.user.points)
        : (Number.isFinite(Number(normalized?.balance)) ? Number(normalized.balance) : Math.max(0, currentCoins - cost));
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      notifyCoinResult(normalized, cost, newPoints, PREMIUM_SERVICE_LABEL[service]);
      if (service === "ziwei") {
        markZiweiPremiumUnlockedClient();
      }
      await new Promise(r => setTimeout(r, 800));
      if (service === 'veda') {
        setVedaFlowState('generating_pdf');
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
      authFetch('/api/billing/me', {
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
          const points = Number(normalized?.balance ?? normalized?.user?.points ?? NaN);
          if (Number.isFinite(points)) {
            const pts = Number(points);
            setCurrentCoins(pts);
            saveUserPoints(pts);
          }
          const restored = buildUnlockStateFromPayload(normalized);
          setUnlockedFeatures((prev) => ({
            ...prev,
            ...restored,
          }));
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
    window.addEventListener('cd:auth-changed', onAuthChanged as EventListener);
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
              <h1 className="mt-2 text-3xl font-black leading-tight">꽃꽃돼지 코인 운명 상점</h1>
              <p className="mt-2 text-sm text-neutral-700">
                무료는 즉시 노출, 유료는 코인으로 개별 해금합니다. 결제 전에는 데이터가 노출되지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-amber-800">현재 잔액</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-extrabold text-amber-900">
                <span aria-hidden="true">🐷</span>
                <span>꽃꽃돼지 코인 {currentCoins}</span>
              </p>
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
            cost={50}
            isUnlocked={unlockedFeatures.healthReport || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("healthReport", 50)}
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
            주역·이집트·지오맨시는 이용할 때마다 차감되고, 스톤헨지 룬점은 배열 선택 후 1룬/3룬/5룬/12룬 단계별 코인이 차감됩니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "turtleIChing" as const, title: "주역 거북점", cost: 30, note: "1회 30코인" },
              { key: "egyptOracle" as const, title: "이집트 신탁", cost: 30, note: "1회 30코인" },
              { key: "geomancy" as const, title: "지오맨시 흙점", cost: 50, note: "1회 50코인" },
              { key: "stonehengeRunes" as const, title: "스톤헨지 룬점", cost: 0, note: "배열별 30/50/70/120코인" },
              { key: "premiumTarot" as const, title: "프리미엄 타로(회복 타로 제외)", cost: 100, note: "1회 100코인" },
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
                  {item.key === "stonehengeRunes" ? "배열 고르고 코인 결제하기" : "꽃꽃돼지 코인으로 운명 확인하기"}
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
            aria-label="VVIP 프리미엄 PDF 컬렉션 열기/닫기"
          >
            <div style={{ fontSize: "0.66rem", fontWeight: 900, letterSpacing: "0.18em", color: "#d4af37" }}>
              VVIP · PREMIUM COLLECTION
            </div>
            <div style={{ marginTop: 5, fontSize: "1.08rem", fontWeight: 900, color: "#fff3c1" }}>
              프리미엄 PDF 운명 분석 컬렉션
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
        <div style={{
          background: "linear-gradient(145deg, rgb(10,6,30) 0%, rgb(18,12,48) 100%)",
          border: "1.5px solid rgba(167,139,250,0.35)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(99,102,241,0.15)",
          position: "relative",
          zIndex: 20,
          pointerEvents: "auto",
        }}>
          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={wrapClick(() => handleOpenPremSection('ziwei'))}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/jamipremiun.webp" alt="H 프리미엄 자미두수"
                width={520}
                height={390}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgb(10,6,30))" }} />
              <span style={{
                position: "absolute", top: "8px", left: "8px",
                background: "rgba(99,102,241,0.9)", color: "#fff",
                fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.14em",
                padding: "2px 7px", borderRadius: "20px", textTransform: "uppercase",
              }}>PREMIUM</span>
            </div>
            <div style={{ flex: 1, padding: "16px 16px 16px 4px" }}>
              <p style={{ color: "rgba(167,139,250,0.65)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 4px" }}>자미두수 · Ziwei Premium</p>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: "0 0 6px", lineHeight: 1.3 }}>자미두수 프리미엄 PDF</p>
              <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>590코인 · 15챕터 · 12궁/사화/대한 심층 분석</p>
              <span style={{
                display: "inline-block",
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.12))",
                border: "1px solid rgba(167,139,250,0.45)",
                color: "rgba(196,181,253,1)", fontWeight: 700, fontSize: "0.7rem",
                padding: "5px 13px", borderRadius: "10px",
              }}>{openPremSection === 'ziwei' ? '▲ 접기' : '✦ 소개 보기'}</span>
            </div>
          </button>
          {openPremSection === 'ziwei' && (
            <div id="prem-active-section" style={{ borderTop: "1px solid rgba(167,139,250,0.2)" }}>
              <HPremiumZiweiBookSection
                showIntro={premiumFlowStage === 'intro'}
                onStartGeneration={() => handleStartPremiumGeneration('ziwei')}
                generationLoading={premiumGateLoading === 'ziwei'}
                isUnlocked={premiumFlowStage === 'generate'}
              />
            </div>
          )}
        </div>

        {/* ─── 2. 점성술 프리미엄 ─── */}
        <div style={{
          background: "linear-gradient(145deg, rgb(7,4,25) 0%, rgb(20,14,5) 100%)",
          border: "1.5px solid rgba(251,191,36,0.35)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(251,191,36,0.12)",
          position: "relative",
          zIndex: 20,
          pointerEvents: "auto",
        }}>
          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={wrapClick(() => handleOpenPremSection('astrology'))}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/premiumstar.webp" alt="점성술 프리미엄 리포트"
                width={520}
                height={390}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgb(7,4,25))" }} />
              <span style={{
                position: "absolute", top: "8px", left: "8px",
                background: "rgba(251,191,36,0.9)", color: "#1a1200",
                fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.14em",
                padding: "2px 7px", borderRadius: "20px", textTransform: "uppercase",
              }}>PREMIUM</span>
            </div>
            <div style={{ flex: 1, padding: "16px 16px 16px 4px" }}>
              <p style={{ color: "rgba(253,230,138,0.65)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 4px" }}>점성술 · Astrology Premium</p>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: "0 0 6px", lineHeight: 1.3 }}>점성술 프리미엄 리포트</p>
              <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>12챕터 · ASC/Sun/Moon 입체 분석 · AI 심층 해석</p>
              <span style={{
                display: "inline-block",
                background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(253,230,138,0.12))",
                border: "1px solid rgba(251,191,36,0.5)",
                color: "rgba(253,230,138,1)", fontWeight: 700, fontSize: "0.7rem",
                padding: "5px 13px", borderRadius: "10px",
              }}>{openPremSection === 'astrology' ? '▲ 접기' : '✦ 소개 보기'}</span>
            </div>
          </button>
          {openPremSection === 'astrology' && (
            <div id="prem-active-section" style={{ borderTop: "1px solid rgba(251,191,36,0.18)" }}>
              <HPremiumAstrologySection
                showIntro={premiumFlowStage === 'intro'}
                onStartGeneration={() => handleStartPremiumGeneration('astrology')}
                generationLoading={premiumGateLoading === 'astrology'}
              />
            </div>
          )}
        </div>

        {/* ─── 3. 숙요점 프리미엄 ─── */}
        <div style={{
          background: "linear-gradient(145deg, rgb(2,8,23) 0%, rgb(4,16,38) 100%)",
          border: "1.5px solid rgba(125,211,252,0.35)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(14,165,233,0.12)",
          position: "relative",
          zIndex: 20,
          pointerEvents: "auto",
        }}>
          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={wrapClick(() => handleOpenPremSection('sukuyo'))}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄"
                width={520}
                height={390}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgb(2,8,23))" }} />
              <span style={{
                position: "absolute", top: "8px", left: "8px",
                background: "rgba(14,165,233,0.9)", color: "#fff",
                fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.14em",
                padding: "2px 7px", borderRadius: "20px", textTransform: "uppercase",
              }}>PREMIUM</span>
            </div>
            <div style={{ flex: 1, padding: "16px 16px 16px 4px" }}>
              <p style={{ color: "rgba(125,211,252,0.65)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 4px" }}>숙요점 · Moonlight Strategy</p>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: "0 0 6px", lineHeight: 1.3 }}>숙요점 프리미엄 PDF</p>
              <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>390코인 · 사주와 분리된 27수 숙요점/궁합/달빛 전략</p>
              <span style={{
                display: "inline-block",
                background: "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(30,27,75,0.2))",
                border: "1px solid rgba(125,211,252,0.42)",
                color: "rgba(125,211,252,1)", fontWeight: 700, fontSize: "0.7rem",
                padding: "5px 13px", borderRadius: "10px",
              }}>{openPremSection === 'sukuyo' ? '▲ 접기' : '✦ 소개 보기'}</span>
            </div>
          </button>
          {openPremSection === 'sukuyo' && (
            <div id="prem-active-section" style={{ borderTop: "1px solid rgba(14,165,233,0.18)" }}>
              <HPremiumSukuyoSection
                showIntro={premiumFlowStage === 'intro'}
                onStartGeneration={() => handleStartPremiumGeneration('sukuyo')}
                generationLoading={premiumGateLoading === 'sukuyo'}
              />
            </div>
          )}
        </div>

        {/* ─── 4. 베다 점성술 프리미엄 ─── */}
        <div style={{
          background: "linear-gradient(145deg, rgb(15,10,3) 0%, rgb(30,18,6) 100%)",
          border: "1.5px solid rgba(251,146,60,0.35)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(234,88,12,0.10)",
          position: "relative",
          zIndex: 20,
          pointerEvents: "auto",
        }}>
          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={wrapClick(() => handleOpenPremSection('veda'))}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/premium%20veda.webp" alt="베다 점성술 프리미엄"
                width={520}
                height={390}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgb(15,10,3))" }} />
              <span style={{
                position: "absolute", top: "8px", left: "8px",
                background: "rgba(234,88,12,0.9)", color: "#fff",
                fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.14em",
                padding: "2px 7px", borderRadius: "20px", textTransform: "uppercase",
              }}>PREMIUM</span>
            </div>
            <div style={{ flex: 1, padding: "16px 16px 16px 4px" }}>
              <p style={{ color: "rgba(253,186,116,0.65)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 4px" }}>베다 점성술 · Vedic Astrology Premium</p>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: "0 0 6px", lineHeight: 1.3 }}>베다 인생 총람 PDF</p>
              <p style={{ color: "rgba(203,213,225,0.50)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>1인 390코인 · 2인 궁합 690코인(추가 300) · 라그나·나크샤트라·다샤 평생 운명 지도</p>
              <span style={{
                display: "inline-block",
                background: "linear-gradient(135deg, rgba(234,88,12,0.22), rgba(253,186,116,0.12))",
                border: "1px solid rgba(251,146,60,0.5)",
                color: "rgba(253,186,116,1)", fontWeight: 700, fontSize: "0.7rem",
                padding: "5px 13px", borderRadius: "10px",
              }}>{openPremSection === 'veda' ? '▲ 접기' : '✦ 소개 보기'}</span>
            </div>
          </button>
          {openPremSection === 'veda' && (
            <div id="prem-active-section" style={{ borderTop: "1px solid rgba(234,88,12,0.18)" }}>
              {vedaFlowError ? (
                <p style={{ margin: "12px 16px 0", color: "rgba(252,165,165,0.9)", fontSize: "0.82rem", fontWeight: 700 }}>
                  ⚠ {vedaFlowError}
                </p>
              ) : null}
              <HPremiumVedicSection
                showIntro={premiumFlowStage === 'intro'}
                onStartGeneration={() => handleStartPremiumGeneration('veda')}
                generationLoading={premiumGateLoading === 'veda'}
                onPdfFlowStateChange={handleVedaPdfFlowStateChange}
              />
            </div>
          )}
        </div>

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
              <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>700코인 · 만세력 엔진 연동 · 용신/오행/수리 작명 PDF</p>
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

        {/* ─── LOVE CODE 사주 연애 시뮬레이션 (하단 배치) ─── */}
        <section className="overflow-hidden rounded-3xl border border-rose-300/60 bg-gradient-to-br from-rose-950/90 via-purple-950/90 to-slate-950/90 shadow-2xl shadow-rose-900/30">
          {/* 배너 이미지 */}
          <div className="relative w-full overflow-hidden" style={{ maxHeight: 320 }}>
            <img
              src="/fuctionassets/lovesimulation.webp"
              alt="LOVE CODE 사주 연애 시뮬레이션"
              width={1200}
              height={800}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              sizes="(max-width: 768px) 100vw, 1200px"
              className="w-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-rose-950/80 via-transparent to-transparent" />
          </div>

          <div className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">💕</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">
                재미 사주 콘텐츠
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-black text-white">
              LOVE CODE — 사주 연애 시뮬레이션
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-rose-200/80">
              상대방의 생년월일을 입력하면 사주 분석 엔진이 그 사람의 오행·일간·MBTI를 계산해
              <strong className="text-rose-300"> 페르소나 캐릭터</strong>를 만들어줍니다.
              다양한 데이트 코스와 선택지를 통해 상대방의 취향·성격을 미리 경험하고
              더 나은 연애를 준비해보세요.
            </p>

            <ul className="mb-5 space-y-1.5 text-sm text-rose-100/70">
              {[
                "🔮 상대방 생년월일 → 사주팔자 명식 분석",
                "✨ 오행·일간·MBTI 기반 연애 페르소나 캐릭터 생성",
                "💬 실시간 채팅으로 상대의 반응 미리 경험",
                "🎲 돌발 데이트 이벤트 & 오행 선택지 시나리오",
                "📊 호감도 게이지 & 감정 변화 실시간 추적",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-950/50 px-4 py-3">
              <div>
                <p className="text-xs text-rose-300/70">1회 이용 요금</p>
                <p className="text-xl font-extrabold text-amber-300">
                  🐷 꽃꽃돼지 코인 100
                </p>
              </div>
              <button
                type="button"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onClick={wrapClick(() => runPaidFeatureOnce('loveSimulation', 100))}
                className="rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-800/40 transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                💕 시뮬레이션 시작
              </button>
            </div>
          </div>
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
            <p className="mt-2 text-lg font-black text-neutral-900">꽃돼지 코인이 부족해요! 충전하시겠어요?</p>
            <p className="mt-2 text-sm text-neutral-600">충전 후 다시 누르면 바로 운명을 열람할 수 있어요.</p>
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
                코인 충전하기
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
