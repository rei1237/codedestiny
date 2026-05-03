"use client";

import { useEffect, useState } from "react";
import HPremiumSukuyoSection from "./HPremiumSukuyoSection";
import HPremiumAstrologySection from "./HPremiumAstrologySection";
import HPremiumVedicSection from "./HPremiumVedicSection";
import HPremiumNamingSection from "./HPremiumNamingSection";
import { showToast } from "./Toast";
import HPremiumZiweiBookSection from "./HPremiumZiweiBookSection";
import { usePayment } from "../hooks/usePayment";

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
  buttonLabel = "꽃꽃돼지 코인으로 운명 확인하기",
  children,
}: LockedSectionProps) {
  if (isUnlocked) {
    return (
      <section className="rounded-3xl border border-amber-300/50 bg-white/90 p-5 shadow-lg shadow-rose-100">
        <h3 className="text-lg font-extrabold text-neutral-900">{title}</h3>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
        <div className="mt-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-4">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-300/60 bg-white/80 p-5 shadow-lg shadow-rose-100">
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
            onClick={onUnlock}
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

const PER_USE_DESTINATION: Partial<Record<PerUseKey, string>> = {
  turtleIChing: "/index.html?action=openJuyukModal",
  egyptOracle: "/index.html?action=openKemetModal",
  geomancy: "/geomancy-oracle-v4.html",
  stonehengeRunes: "/oracle/rune",
  premiumTarot: "/index.html?action=openTarotModal",
  loveSimulation: "/saju/love-simulation",
};

const FREE_FEATURES = [
  "기본 만세력: 연/월/일/시 명식표 + 일주 캐릭터 요약",
  "재미 콘텐츠: 매력 테스트, 로또 기능",
  "데일리: 타짜 화투점, 데스티니 포커, 오늘/이달 운세 키워드, 돼지 주석점, 영국 홍차점",
  "맛보기: MBTI 동물 궁합, 사주네컷, 최강 T발놈 테스트",
  "사주 AI 프롬프트 맛보기: 이상형 얼굴, 운명적 풍경, 사주 아바타",
  "행복한 회복 타로",
];

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

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

function saveUserPoints(points: number) {
  try {
    const raw = localStorage.getItem('fortune_auth_user');
    const user = raw ? JSON.parse(raw) : {};
    user.points = points;
    localStorage.setItem('fortune_auth_user', JSON.stringify(user));
  } catch (_) {}
}

function notifyCoinDeducted(cost: number, points: number, label: string) {
  showToast(`🪙 ${label} 이용으로 ${cost}코인이 차감되었습니다. 남은 코인: ${Number(points).toLocaleString("ko-KR")}`, "info");
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
  const [unlockedFeatures, setUnlockedFeatures] = useState<Record<UnlockKey, boolean>>({
    allPaidSaju: false,
    rpgCharacter: false,
    travelDestiny: false,
    healthReport: false,
    sajuDiary: false,
    secretHouseEpisodes: false,
    premiumDivinationPack: false,
  });

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
      const res = await fetch(url, { ...init, signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } finally {
      clearTimeout(timer);
    }
  }

  const unlockByCoins = async (key: UnlockKey, cost: number, alsoUnlock?: UnlockKey[]) => {
    if (unlockedFeatures[key]) return;
    const token = localStorage.getItem('fortune_auth_token');
    if (!token && !isAdminUser) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login?next=%2F';
      return;
    }
    const adminToken = getFlowerAdminTokenClient();
    // 관리자 모드: API 호출 없이 즉시 해금 (코인 차감 없음)
    if (adminToken || isAdminUser) {
      setUnlockedFeatures((prev) => {
        const next = { ...prev, [key]: true };
        if (alsoUnlock?.length) for (const aliasKey of alsoUnlock) next[aliasKey] = true;
        return next;
      });
      setSparkleTarget(key);
      return;
    }
    const adminTestTier = getFlowerAdminTestTierClient();
    const authHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
      ...(adminToken && adminTestTier ? { 'x-admin-subscription-tier': adminTestTier } : {}),
    };
    try {
      const { res, data } = await fetchJsonWithTimeout('/api/fortune/pig-coin/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ cost, reason: `${key} 해금`, featureKey: key, forceDeduct: true, requestId: `unlock:${key}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9) }),
      });
      if (res.status === 402) { setShowRechargeModal(true); return; }
      if (!res.ok) { alert(data.message || '코인 차감 실패'); return; }
      const newPoints = data?.user?.points !== undefined ? Number(data.user.points) : Math.max(0, currentCoins - cost);
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      notifyCoinDeducted(cost, newPoints, key);
      setUnlockedFeatures((prev) => {
        const next = { ...prev, [key]: true };
        if (alsoUnlock?.length) {
          for (const aliasKey of alsoUnlock) next[aliasKey] = true;
        }
        return next;
      });
      setSparkleTarget(key);
    } catch (e) {
      console.error('[unlockByCoins]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const runPaidFeatureOnce = async (key: PerUseKey, cost: number) => {
    const token = localStorage.getItem('fortune_auth_token');
    if (!token && !isAdminUser) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login?next=%2F';
      return;
    }
    const adminToken = getFlowerAdminTokenClient();
    // 관리자 모드: API 호출 없이 즉시 회당 사용 처리 (코인 차감 없음)
    if (adminToken || isAdminUser) {
      setPerUseCount((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      setSparkleTarget(key);
      redirectPerUseFeature(key);
      return;
    }
    const adminTestTier = getFlowerAdminTestTierClient();
    const authHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
      ...(adminToken && adminTestTier ? { 'x-admin-subscription-tier': adminTestTier } : {}),
    };
    try {
      const { res, data } = await fetchJsonWithTimeout('/api/fortune/pig-coin/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ cost, reason: `${key} 이용`, featureKey: key, forceDeduct: true, requestId: `use:${key}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9) }),
      });
      if (res.status === 402) { setShowRechargeModal(true); return; }
      if (!res.ok) { alert(data.message || '코인 차감 실패'); return; }
      const newPoints = data?.user?.points !== undefined ? Number(data.user.points) : Math.max(0, currentCoins - cost);
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      notifyCoinDeducted(cost, newPoints, key);
      setPerUseCount((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      setSparkleTarget(key);
      redirectPerUseFeature(key);
    } catch (e) {
      console.error('[runPaidFeatureOnce]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const runPremiumIntroGate = async (service: PremiumServiceKey) => {
    const token = localStorage.getItem('fortune_auth_token');
    if (!token && !isAdminUser) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login?next=%2F';
      return false;
    }

    if (unlockedFeatures.premiumDivinationPack) {
      return true;
    }

    const adminToken = getFlowerAdminTokenClient();
    // 관리자 모드: 잔액 확인 없이 즉시 통과 (코인 차감 없음)
    if (adminToken || isAdminUser) {
      return true;
    }
    const adminTestTier = getFlowerAdminTestTierClient();
    const authHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
      ...(adminToken && adminTestTier ? { 'x-admin-subscription-tier': adminTestTier } : {}),
    };
    try {
      const { res, data } = await fetchJsonWithTimeout('/api/fortune/pig-coin/balance', {
        method: 'GET',
        headers: { ...authHeaders },
      });
      if (!res.ok) {
        throw new Error(data?.message || '잔액 확인에 실패했습니다.');
      }

      const points = Number(data?.user?.points ?? currentCoins ?? 0);
      setCurrentCoins(points);
      saveUserPoints(points);

      const required = PREMIUM_SERVICE_COST[service] ?? 0;
      if (points < required) {
        setShowRechargeModal(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[runPremiumIntroGate]', error);
      setPremiumGateError('코인/권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return false;
    }
  };

  const handleOpenPremSection = (key: PremiumServiceKey) => {
    if (openPremSection === key) {
      setOpenPremSection(null);
      setPremiumFlowStage('intro');
      setPremiumGateError('');
      return;
    }
    setOpenPremSection(key);
    setPremiumFlowStage('intro');
    setPremiumGateError('');
    setTimeout(() => {
      document.getElementById('prem-active-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const launchPremiumPdfModal = (service: PremiumServiceKey) => {
    if (typeof window === 'undefined') return;

    const loadScriptAndCall = (src: string, globalFnName: string) => {
      const existing = document.querySelector(`script[src^="${src.split('?')[0]}"]`);
      if (existing) {
        if (typeof (window as any)[globalFnName] === 'function') {
          (window as any)[globalFnName]();
        }
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        if (typeof (window as any)[globalFnName] === 'function') {
          (window as any)[globalFnName]();
        }
      };
      document.body.appendChild(script);
    };

    if (service === 'ziwei') {
      loadScriptAndCall('/js/ziwei-book.js?v=20260410-v2', 'openZiweiBookModal');
    } else if (service === 'astrology') {
      loadScriptAndCall('/js/astro-book.js?v=20260410-v2', 'openAstroBookModal');
    } else if (service === 'sukuyo') {
      loadScriptAndCall('/js/sukuyo-book.js?v=20260410-v2', 'openSukuyoBookModal');
    } else if (service === 'veda') {
      loadScriptAndCall('/js/vedic-book.js?v=20260410-v2', 'openVedicBookModal');
    }
  };

  const handleStartPremiumGeneration = async (service: PremiumServiceKey) => {
    if (premiumGateLoading) return;

    setPremiumGateError('');
    const premiumLabel = PREMIUM_SERVICE_LABEL[service] ?? '프리미엄 리포트';
    startPayment(`${premiumLabel} 결제를 확인 중입니다.`);

    try {
      const passed = await runPremiumIntroGate(service);
      if (!passed) return;

      if (unlockedFeatures.premiumDivinationPack) {
        if (service === 'naming') {
          setPremiumFlowStage('generate');
        } else {
          launchPremiumPdfModal(service);
        }
        return;
      }

      const token = localStorage.getItem('fortune_auth_token');
      if (!token && !isAdminUser) return;
      const adminToken = getFlowerAdminTokenClient();
      // 관리자 모드: consume API 없이 즉시 generate 단계로 이동 (코인 차감 없음)
      if (adminToken || isAdminUser) {
        if (service === 'naming') {
          setPremiumFlowStage('generate');
        } else {
          launchPremiumPdfModal(service);
        }
        return;
      }
      const adminTestTier = getFlowerAdminTestTierClient();
      const authHeaders = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(adminToken ? { 'x-admin-token': adminToken } : {}),
        ...(adminToken && adminTestTier ? { 'x-admin-subscription-tier': adminTestTier } : {}),
      };

      const cost = PREMIUM_SERVICE_COST[service];
      setPaymentMessage(`${premiumLabel} 결제를 진행 중입니다.`);
      setPremiumGateLoading(service);
      try {
        const { res, data } = await fetchJsonWithTimeout('/api/fortune/pig-coin/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ cost, reason: `${service} 프리미엄 생성`, featureKey: `premium-${service}`, forceDeduct: true, requestId: `premium:${service}:` + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 9) }),
        });
        if (res.status === 402) { setShowRechargeModal(true); return; }
        if (!res.ok) { setPremiumGateError(data.message || '코인 차감 실패'); return; }
        const newPoints = data?.user?.points !== undefined ? Number(data.user.points) : Math.max(0, currentCoins - cost);
        setCurrentCoins(newPoints);
        saveUserPoints(newPoints);
        notifyCoinDeducted(cost, newPoints, `${service} 프리미엄`);
        if (service === 'naming') {
          setPremiumFlowStage('generate');
        } else {
          launchPremiumPdfModal(service);
        }
      } catch (e) {
        console.error('[handleStartPremiumGeneration]', e);
        setPremiumGateError('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setPremiumGateLoading(null);
      }
    } finally {
      endPayment();
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
    // 1) localStorage에서 즉시 표시
    try {
      const raw = localStorage.getItem('fortune_auth_user');
      const user = raw ? JSON.parse(raw) : {};
      const admin = isAdminSessionClient();
      setIsAdminUser(admin);
      if (typeof user?.points === 'number') {
        setCurrentCoins(user.points);
      }
    } catch (_) {}
    // 2) API로 실제 잔액 동기화
    const token = localStorage.getItem('fortune_auth_token');
    if (!token && !isAdminSessionClient()) return;
    const adminToken = getFlowerAdminTokenClient();
    const adminTestTier = getFlowerAdminTestTierClient();
    const authHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
      ...(adminToken && adminTestTier ? { 'x-admin-subscription-tier': adminTestTier } : {}),
    };
    fetch('/api/fortune/pig-coin/balance', {
      headers: { ...authHeaders },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.points !== undefined) {
          const pts = Number(d.user.points);
          setCurrentCoins(pts);
          saveUserPoints(pts);
        }
      })
      .catch(() => {});
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
            cost={50}
            isUnlocked={unlockedFeatures.rpgCharacter || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("rpgCharacter", 50)}
          >
            <p className="text-sm text-neutral-700">전투 타입, 성장 타입, 파티 궁합이 공개되었습니다.</p>
          </LockedSection>

          <LockedSection
            title="사주로 보는 여행지"
            cost={100}
            isUnlocked={unlockedFeatures.travelDestiny || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("travelDestiny", 100)}
          >
            <p className="text-sm text-neutral-700">당신의 운을 살리는 여행지 3곳과 피해야 할 시즌이 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="명리 헬스 리포트"
            cost={100}
            isUnlocked={unlockedFeatures.healthReport || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("healthReport", 100)}
          >
            <p className="text-sm text-neutral-700">체질 관리 포인트와 일상 루틴 추천이 활성화되었습니다.</p>
          </LockedSection>

          <LockedSection
            title="사주 다이어리"
            cost={200}
            isUnlocked={unlockedFeatures.sajuDiary || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("sajuDiary", 200)}
          >
            <p className="text-sm text-neutral-700">오늘 기록 템플릿과 월간 리포트 생성이 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="시크릿 하우스 전체 에피소드"
            cost={100}
            isUnlocked={unlockedFeatures.secretHouseEpisodes || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("secretHouseEpisodes", 100)}
          >
            <p className="text-sm text-neutral-700">모든 에피소드/멀티 엔딩/숨겨진 루트가 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="프리미엄 점술 패키지"
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
          <h2 className="text-xl font-black text-rose-800">회당 과금 점술 (1회당 50코인)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            주역 거북점, 이집트 신탁, 지오멘시 흙점, 스톤헨지 룬점, 행복한 회복 타로를 제외한 타로 기능은 1회 이용마다 코인이 차감됩니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "turtleIChing" as const, title: "주역 거북점" },
              { key: "egyptOracle" as const, title: "이집트 신탁" },
              { key: "geomancy" as const, title: "지오멘시 흙점" },
              { key: "stonehengeRunes" as const, title: "스톤헨지 룬점" },
              { key: "premiumTarot" as const, title: "프리미엄 타로(회복 타로 제외)" },
            ].map((item) => (
              <article
                key={item.key}
                className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4"
              >
                <h3 className="font-bold text-neutral-900">{item.title}</h3>
                <p className="mt-1 text-xs text-neutral-600">이용 횟수: {perUseCount[item.key]}회</p>

                <button
                  type="button"
                  onClick={() => runPaidFeatureOnce(item.key, 50)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  꽃꽃돼지 코인으로 운명 확인하기
                </button>

                {perUseCount[item.key] > 0 ? (
                  <p className="mt-3 rounded-lg border border-amber-100 bg-white/70 p-2 text-xs text-neutral-700">
                    최근 결과가 열렸습니다. (데모 표시)
                  </p>
                ) : (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-white/40 p-2 text-xs text-neutral-500 blur-[6px] grayscale-[50%] select-none">
                    결제 전 결과 데이터 비노출
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
            onClick={() => setPremiumCollectionOpen((prev) => !prev)}
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
            onClick={() => handleOpenPremSection('ziwei')}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/jamipremiun.webp" alt="H 프리미엄 자미두수"
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
              <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>590코인 · 13챕터 · 12궁/사화/대한 심층 분석</p>
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
            onClick={() => handleOpenPremSection('astrology')}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/premiumstar.webp" alt="점성술 프리미엄 리포트"
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
            onClick={() => handleOpenPremSection('sukuyo')}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄"
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
            onClick={() => handleOpenPremSection('veda')}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/premium%20veda.webp" alt="베다 점성술 프리미엄"
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
              <p style={{ color: "rgba(203,213,225,0.50)", fontSize: "0.75rem", lineHeight: 1.6, margin: "0 0 10px" }}>390코인 · 라그나·나크샤트라·다샤 평생 운명 지도</p>
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
              <HPremiumVedicSection
                showIntro={premiumFlowStage === 'intro'}
                onStartGeneration={() => handleStartPremiumGeneration('veda')}
                generationLoading={premiumGateLoading === 'veda'}
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
            onClick={() => handleOpenPremSection('naming')}
            style={{
              width: "100%", display: "flex", flexDirection: "row", alignItems: "center",
              gap: "16px", padding: "0", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ position: "relative", width: "130px", minWidth: "130px", aspectRatio: "4/3", flexShrink: 0 }}>
              <img src="/fuctionassets/naming.webp" alt="명운 작명 프리미엄"
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
                onClick={() => runPaidFeatureOnce('loveSimulation', 100)}
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

      {showRechargeModal ? (
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
                  window.location.href = '/points';
                }}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                코인 충전하기
              </button>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
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
