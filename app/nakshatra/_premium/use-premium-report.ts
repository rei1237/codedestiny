"use client";

// 나크샤트라 영구 해금 리포트 2종(지배성 · 다샤 인생지도)의 공통 배선.
//
// 두 화면은 본문 렌더만 다르고 진입 경로·결제·잠금 판정이 같다. 같은 로직을 두 번 쓰면
// 한쪽만 고쳐지는 사고가 나므로(과거 결제 게이트 회귀 이력) 여기 한 곳에 둔다.
//
// 🔴 결제 게이팅은 공용 게이트(useCoinGate → /api/billing/coin-gate)에만 맡긴다.
//    이용권 선검사 → 미커버 시 단건/월정석 동등 노출은 그쪽이 서버 결정으로 수행하므로
//    여기서 paymentMode 를 지정하거나 pass 를 재판정하지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import { postPaidBody } from "../nakshatra-fetch";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { useContentUnlock } from "@/app/_lib/use-content-unlock";
import { hasLedgerUnlock } from "@/app/_lib/optimistic-unlock-ledger";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";
import { useNakshatraCopy, type NakshatraCopy } from "../_lib/copy";

function errorText(copy: NakshatraCopy) {
  return {
    login: copy.loginRequiredMessage,
    degraded: copy.degradedMessage,
    failed: copy.reportFailedMessage,
    payment: copy.paymentFailedMessage,
  } as const;
}

export interface PremiumProduct {
  featureKey: string;
  coinPrice: number;
  amountKRW: number;
  reason: string;
  endpoint: string;
}

export interface NatalLabel {
  sukuyoKo: string;
  sukuyoHan: string;
  nakshatraKo: string;
  nakshatraEn: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function toText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

// /nakshatra 무료 결과가 sessionStorage 에 남긴 명식 + 입력을 되살린다.
function readStoredSession(): { birth: NakshatraBirthInput; natal: NatalLabel } | null {
  try {
    const raw = sessionStorage.getItem(NAKSHATRA_RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = asRecord(JSON.parse(raw));
    const input = asRecord(parsed.input);
    if (!Number(input.year) || !Number(input.month) || !Number(input.day)) return null;
    const dongyang = asRecord(parsed.dongyang);
    const india = asRecord(parsed.india);
    const summary = asRecord(parsed.summary);
    return {
      birth: {
        year: Number(input.year), month: Number(input.month), day: Number(input.day),
        hour: Number(input.hour ?? 12), minute: Number(input.minute ?? 0),
        timezone: Number(input.timezone ?? 9), lat: Number(input.lat ?? 37.5665), lon: Number(input.lon ?? 126.978),
        timeUnknown: Boolean(input.timeUnknown),
        gender: input.gender === "male" || input.gender === "female" ? input.gender : "",
      },
      natal: {
        sukuyoKo: toText(dongyang.nameKo), sukuyoHan: toText(dongyang.nameHan),
        nakshatraKo: toText(india.nameKo || summary.nakshatraKo), nakshatraEn: toText(india.nameEn || summary.nakshatraEn),
      },
    };
  } catch {
    return null;
  }
}

export interface UsePremiumReportResult<T> {
  report: T | null;
  birth: NakshatraBirthInput | null;
  natal: NatalLabel | null;
  /** 서버 판정이 끝났고 미해금일 때만 true — "확인 실패"를 미구매로 취급하지 않는다. */
  confirmedLocked: boolean;
  unlocked: boolean;
  checking: boolean;
  loading: boolean;
  paying: boolean;
  error: string;
  unlock: () => Promise<void>;
  reload: () => Promise<void>;
  /** 성별이 필요한 리포트(동양 대운)에서 사용자가 직접 고를 때. 고른 뒤 본문을 다시 받는다. */
  setGender: (gender: "male" | "female") => void;
}

export function usePremiumReport<T>(product: PremiumProduct): UsePremiumReportResult<T> {
  const copy = useNakshatraCopy();
  const ERROR_TEXT = errorText(copy);
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const { unlocked, status: unlockStatus, refetch: refetchUnlocks, markOptimisticallyUnlocked } = useContentUnlock([product.featureKey]);
  const { seed: profileSeed } = useAiProfileSeed();

  // 원장을 먼저 읽어 첫 페인트에서 잠금 화면이 번쩍이지 않게 한다(IslandConsultClient 선례).
  const [ledgerUnlocked, setLedgerUnlocked] = useState(false);
  const [birth, setBirth] = useState<NakshatraBirthInput | null>(null);
  const [natal, setNatal] = useState<NatalLabel | null>(null);
  const [report, setReport] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => { if (hasLedgerUnlock(product.featureKey)) setLedgerUnlocked(true); }, [product.featureKey]);

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) return;
    setBirth(stored.birth);
    setNatal(stored.natal);
  }, []);

  // 세션에 명식이 없을 때만 프로필 카드 시드로 채운다(빈 값만 채우는 원칙).
  //
  // 🔴 성별은 예외로 세션 값이 있어도 보강한다 — /api/nakshatra/resolve 는 입력을 되돌려 줄 때
  //    gender 를 싣지 않고(무료 폼도 성별을 받지 않는다), 다샤 인생지도의 동양 대운은 성별이 없으면
  //    순행·역행이 정해지지 않아 통째로 빠진다. 프로필 카드가 이 값의 정본이다.
  useEffect(() => {
    const derived = birthFromProfileSeed(profileSeed);
    if (!derived) return;
    setBirth((prev) => {
      if (!prev) return derived;
      if (prev.gender || !derived.gender) return prev;
      return { ...prev, gender: derived.gender };
    });
  }, [profileSeed]);

  const setGender = useCallback((gender: "male" | "female") => {
    setBirth((prev) => (prev ? { ...prev, gender } : prev));
    fetchedRef.current = false;
    setReport(null);
  }, []);

  const isUnlocked = ledgerUnlocked || unlocked[product.featureKey] === true;
  const confirmedLocked = unlockStatus === "ready" && !isUnlocked;

  const load = useCallback(async () => {
    if (!birth || loading) return;
    setLoading(true);
    setError("");
    try {
      // 🔴 일시적 503(Mongo 블립·세션 리프레시 지연)은 공용 판정·백오프로 자동 재시도한다.
      //    이 완충이 없으면 블립 한 번에 "연결이 불안정해요"로 굳어 사용자가 수동 재시도해야 했다.
      const { data, status, transient } = await postPaidBody(product.endpoint, birth as unknown as Record<string, unknown>);
      if (data.ok && data.report) {
        setReport(data.report as T);
        fetchedRef.current = true;
        return;
      }
      if (status === 402 || data.reason === "PAYMENT_REQUIRED") return;   // 잠금 유지
      if (status === 401 || data.reason === "LOGIN_REQUIRED") { setError(ERROR_TEXT.login); return; }
      if (transient) { setError(ERROR_TEXT.degraded); return; }
      setError(toText(data.message) || ERROR_TEXT.failed);
    } catch {
      setError(ERROR_TEXT.failed);
    } finally {
      setLoading(false);
    }
  }, [birth, loading, product.endpoint, ERROR_TEXT]);

  // 해금 + 생년 정보가 갖춰지면 한 번만 자동으로 본문을 채운다.
  useEffect(() => {
    if (!isUnlocked || !birth || report || fetchedRef.current || loading) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, birth, report]);

  const unlock = useCallback(async () => {
    if (isPaying || loading) return;
    setError("");
    const result = await ensurePaidAccess({
      featureKey: product.featureKey,
      coinPrice: product.coinPrice,
      cost: product.coinPrice,
      amountKRW: product.amountKRW,
      reason: product.reason,
      requestId: `${product.featureKey}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    if (!result.ok) {
      if (result.code === "AUTH_REQUIRED" || result.code === "LOGIN_REQUIRED") { setError(ERROR_TEXT.login); return; }
      if (result.code !== "PAYMENT_CANCELLED") setError(result.message || ERROR_TEXT.payment);
      return;
    }
    // 서버 스냅샷 반영 전까지 낙관적으로 열어 둔다(원장에도 기록돼 새로고침·다른 탭에서 유지).
    markOptimisticallyUnlocked(product.featureKey);
    setLedgerUnlocked(true);
    fetchedRef.current = false;
    await load();
    void refetchUnlocks({ force: true });
  }, [ensurePaidAccess, isPaying, load, loading, markOptimisticallyUnlocked, product, refetchUnlocks, ERROR_TEXT]);

  const reload = useCallback(async () => {
    fetchedRef.current = false;
    setReport(null);
    await load();
  }, [load]);

  return {
    report,
    birth,
    natal,
    confirmedLocked,
    unlocked: isUnlocked,
    checking: unlockStatus === "loading",
    loading,
    paying: isPaying,
    error,
    unlock,
    reload,
    setGender,
  };
}
