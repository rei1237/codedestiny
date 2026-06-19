"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CreditCard, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";

type DevTesterUser = {
  userId: string;
  email?: string;
  name?: string;
  paidFeatures?: string[];
  licenses?: {
    standard?: number;
    premium?: number;
    vvip?: number;
    status?: string;
    expiresAt?: string | null;
  } | null;
  profileSubscription?: {
    tier?: string;
    passTier?: string;
    passRemainingUses?: number;
    profileLimit?: number;
    maxCoveredCoin?: number;
    expiresAt?: string | null;
  } | null;
  monthlySubscription?: {
    active?: boolean;
    status?: string;
    tier?: string;
    expiresAt?: string | null;
  } | null;
};

const DEFAULT_FEATURE_KEY = "saju_ai_question";

function formatPassLabel(user: DevTesterUser | null) {
  const licenses = user?.licenses || null;
  const sub = user?.profileSubscription || null;
  const tier = String(sub?.passTier || sub?.tier || "free");
  const remaining = Number(sub?.passRemainingUses || 0);
  const limit = Number(sub?.maxCoveredCoin || 0);
  const licenseCounts = licenses
    ? `S${Number(licenses.standard || 0)} P${Number(licenses.premium || 0)} V${Number(licenses.vvip || 0)}`
    : "";
  const remainingLabel = tier === "family" ? "무제한" : (remaining ? String(remaining) : "");
  const limitLabel = tier === "family" ? "전체 이용" : (limit ? `${limit}c` : "");
  return `${tier}${remainingLabel ? ` / ${remainingLabel}` : ""}${limitLabel ? ` / ${limitLabel}` : ""}${licenseCounts ? ` / ${licenseCounts}` : ""}`;
}

export default function DevPaymentTester() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [featureKey, setFeatureKey] = useState(DEFAULT_FEATURE_KEY);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<DevTesterUser | null>(null);

  const hidden = process.env.NODE_ENV === "production";

  const loadState = useCallback(async () => {
    if (hidden) return;
    setBusy(true);
    try {
      const response = await authFetch("/api/billing/dev-payment-tester", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "DEV_PAYMENT_TESTER_LOAD_FAILED");
      setUser(payload?.data?.user || null);
      setMessage("loaded");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [hidden]);

  const applyState = useCallback(async (action: string) => {
    if (hidden || busy) return;
    setBusy(true);
    try {
      const body = action === "paid-feature"
        ? { action, featureKey: featureKey.trim() || DEFAULT_FEATURE_KEY }
        : { action };
      const response = await authFetch("/api/billing/dev-payment-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.code || "DEV_PAYMENT_TESTER_UPDATE_FAILED");
      setUser(payload?.data?.user || null);
      setMessage(action);
      window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: { source: "dev-payment-tester", event: "login", at: Date.now() } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "update failed");
    } finally {
      setBusy(false);
    }
  }, [busy, featureKey, hidden]);

  useEffect(() => {
    if (!hidden && open && !user) void loadState();
  }, [hidden, loadState, open, user]);

  const passLabel = useMemo(() => {
    return formatPassLabel(user);
  }, [user]);

  if (hidden) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[2147482000] inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-amber-200/40 bg-slate-950/90 text-amber-100 shadow-xl backdrop-blur"
        aria-label="Dev payment tester"
        title="Dev payment tester"
      >
        <CreditCard size={18} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[2147482000] w-[min(380px,calc(100vw-32px))] rounded-[8px] border border-slate-200/20 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black">
          <ShieldCheck size={16} />
          Dev Payment Tester
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/10 bg-white/5 text-white/80"
          aria-label="Close"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-3 grid gap-1 rounded-[8px] border border-white/10 bg-white/[.04] p-2 text-xs text-slate-200">
        <span className="inline-flex items-center gap-1 font-semibold text-white">
          <UserRound size={13} />
          {user?.email || user?.userId || "No current user"}
        </span>
        <span>license: {passLabel}</span>
        <span>monthly: {user?.monthlySubscription?.active ? "active" : "none"}</span>
        <span>paid: {(user?.paidFeatures || []).slice(0, 3).join(", ") || "none"}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => applyState("free")} className="min-h-10 rounded-[8px] bg-white/10 px-2 text-[11px] font-bold leading-tight disabled:opacity-50">무료 계정으로 전환</button>
        <button type="button" disabled={busy} onClick={() => applyState("standard")} className="min-h-10 rounded-[8px] bg-amber-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">스탠다드 3개 지급</button>
        <button type="button" disabled={busy} onClick={() => applyState("premium")} className="min-h-10 rounded-[8px] bg-cyan-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">프리미엄 7개 지급</button>
        <button type="button" disabled={busy} onClick={() => applyState("vvip")} className="min-h-10 rounded-[8px] bg-fuchsia-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">VVIP 15개 지급</button>
        <button type="button" disabled={busy} onClick={() => applyState("family")} className="min-h-10 rounded-[8px] bg-yellow-100 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">패밀리 전체 이용</button>
        <button type="button" disabled={busy} onClick={() => applyState("monthly")} className="min-h-10 rounded-[8px] bg-emerald-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">월정석 활성화</button>
        <button type="button" disabled={busy} onClick={() => applyState("reset")} className="min-h-10 rounded-[8px] bg-rose-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">권한 초기화</button>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={featureKey}
          onChange={(event) => setFeatureKey(event.target.value)}
          className="min-h-9 flex-1 rounded-[8px] border border-white/10 bg-black/30 px-2 text-xs text-white outline-none"
          placeholder="featureKey"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => applyState("paid-feature")}
          className="inline-flex min-h-9 items-center gap-1 rounded-[8px] bg-lime-200 px-3 text-xs font-black text-slate-950 disabled:opacity-50"
        >
          <BadgeCheck size={14} />
          단건 완료
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={loadState}
        className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/5 text-xs font-bold text-slate-200 disabled:opacity-50"
      >
        <RefreshCw size={13} />
        {busy ? "처리 중" : "새로고침"} / {message || "ready"}
      </button>
    </div>
  );
}
