"use client";

/**
 * 영냥이(SoulCat) 단건 결제 호스트.
 *
 * 흐름: SoulCat 이 402 `PAYMENT_REQUIRED` 로 `/checkout/?featureKey=yeongnyangi-…&returnTo=/yeongnyangi/…` 를
 * 가리킨다 → 여기서 CD 결제창을 **단건(카드·카카오페이) 전용**으로 연다 → 결제가 끝나면 returnTo 로 돌아간다.
 * SoulCat 은 이후 `/api/yeongnyangi-entitlement` 로 증빙을 읽고 책을 만든다.
 *
 * 🔴 단건 전용은 두 겹이다. ① 서버: `paymentScope:"direct_only"` 상품은 이용권·월정석 게이트가 402 로 거부
 *    (worker/payments/index.js). ② 이 호출부: `allowedPaymentModes:["direct"]` + 이용권 선검사 3종 off 로
 *    결제창에 이용권·월정석 카드를 그리지 않는다. 렌더러는 서버 hiddenMethods 를 읽지 않으므로 ②를 빼면 안 된다.
 * 🔴 featureKey 는 `yeongnyangi-` 접두만 받는다 — 이 페이지가 다른 상품의 우회 결제창이 되면 안 된다.
 * 🔴 가격은 레지스트리(resolveServerFeaturePricing)에서만 온다. URL 의 금액을 믿지 않는다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import { runPaidAccessGate } from "@/app/_lib/billing-client";
import { sanitizeAuthReturnPath } from "@/app/_lib/auth-return";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";

const FEATURE_KEY_PATTERN = /^yeongnyangi-[a-z0-9-]+$/;
const RETURN_TO_PREFIX = "/yeongnyangi/";
const DEFAULT_RETURN_TO = "/yeongnyangi/";
const RESUME_KIND = "yeongnyangi-checkout";
const YEONGNYANGI_QUOTE = "이용권? 월정석? 먹지도 못하는 걸 어디에 써? 나는 꽃돼지 연이처럼 그렇게 혜자는 아니야~";

type CheckoutParams = {
  featureKey: string;
  returnTo: string;
};

type GateState =
  | { phase: "idle" }
  | { phase: "paying" }
  | { phase: "paid" }
  | { phase: "cancelled" }
  | { phase: "error"; message: string };

/** returnTo 는 auth-return 규칙을 통과한 뒤에도 영냥이 경로만 허용한다(오픈 리다이렉트 봉쇄). */
function resolveReturnTo(raw: string | null): string {
  const safe = sanitizeAuthReturnPath(raw);
  if (!safe || !safe.startsWith(RETURN_TO_PREFIX)) return DEFAULT_RETURN_TO;
  return safe;
}

function resolveFeatureKey(raw: string | null): string {
  const key = String(raw || "").trim().toLowerCase();
  return FEATURE_KEY_PATTERN.test(key) ? key : "";
}

function readParams(): CheckoutParams {
  if (typeof window === "undefined") return { featureKey: "", returnTo: DEFAULT_RETURN_TO };
  const params = new URLSearchParams(window.location.search);
  return {
    featureKey: resolveFeatureKey(params.get("featureKey")),
    returnTo: resolveReturnTo(params.get("returnTo")),
  };
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  const next = encodeURIComponent(`${pathname}${search || ""}`);
  window.location.assign(`/login?next=${next}&returnTo=${next}&redirect=${next}`);
}

function formatKrw(amount: number): string {
  return `${Math.max(0, Math.round(amount)).toLocaleString("ko-KR")}원`;
}

export default function CheckoutClient() {
  const [params] = useState<CheckoutParams>(() => readParams());
  const auth = useAuthStore();
  const [gate, setGate] = useState<GateState>({ phase: "idle" });

  const pricing = useMemo(() => {
    if (!params.featureKey) return null;
    return resolveServerFeaturePricing({ featureKey: params.featureKey });
  }, [params.featureKey]);

  // 모바일 PG 복귀: 문서가 새로 열리므로 결제 전 굳혀 둔 returnTo 로 돌아간다(게이트를 다시 타지 않는다).
  const buildResume = usePaidResume(RESUME_KIND, (args) => {
    const target = resolveReturnTo(typeof args.returnTo === "string" ? args.returnTo : null);
    window.location.assign(target);
    return true;
  });

  const authSettled = auth.status !== "unknown" && auth.status !== "authenticating" && auth.status !== "refreshing";
  const signedIn = auth.isAuthenticated || Boolean(auth.user);

  useEffect(() => {
    try {
      void refreshAuth();
    } catch {
      // 최종 판정은 결제 게이트(서버)가 한다.
    }
  }, []);

  useEffect(() => {
    if (!pricing || !authSettled || signedIn) return;
    // 미로그인은 로그인 뒤 이 페이지(쿼리 포함)로 돌아온다.
    redirectToLogin();
  }, [pricing, authSettled, signedIn]);

  const startPayment = useCallback(async () => {
    if (!pricing || gate.phase === "paying") return;
    setGate({ phase: "paying" });
    const requestId = `yn-${pricing.featureKey}-${Date.now()}`;
    const result = await runPaidAccessGate({
      featureKey: pricing.featureKey,
      reason: "yeongnyangi-checkout",
      requestId,
      // 레지스트리 가격을 그대로 싣는다(게이트 가격 커버리지 검증기의 인라인 가격 요건).
      cost: pricing.cost,
      amountKRW: pricing.amountKRW,
      // 단건 전용 — 이용권·월정석 카드와 이용권 선검사를 모두 끈다.
      allowedPaymentModes: ["direct"],
      disablePassFirst: true,
      disablePassChoice: true,
      skipPassProbe: true,
      resume: buildResume({ returnTo: params.returnTo }),
    });
    if (result.ok) {
      setGate({ phase: "paid" });
      window.location.assign(params.returnTo);
      return;
    }
    const code = String(result.error?.code || "").toUpperCase();
    if (code === "AUTH_REQUIRED" || code === "UNAUTHORIZED" || result.status === 401) {
      redirectToLogin();
      return;
    }
    if (code === "PAYMENT_CANCELLED") {
      setGate({ phase: "cancelled" });
      return;
    }
    setGate({
      phase: "error",
      message: String(result.error?.message || result.message || "결제를 진행하지 못했어요. 잠시 후 다시 시도해 주세요."),
    });
  }, [pricing, gate.phase, buildResume, params.returnTo]);

  return (
    <div className="min-h-screen bg-[#0b0a14] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/80">Yeongnyangi</p>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">영냥이 복채 결제</h1>

        <div className="mt-6 rounded-2xl border border-amber-200/20 bg-white/5 p-5 text-sm leading-7 text-amber-50/85">
          <p className="font-semibold text-amber-100">영냥이의 세계는 코드 데스티니와 다른 차원이에요.</p>
          <p className="mt-1">
            달빛 이용권도, 월정석도 그 문을 넘지 못합니다. 복채는 생선값 그대로, 단건 결제(카드·카카오페이 등)만 받아요.
          </p>
          <blockquote className="mt-4 border-l-2 border-amber-300/60 pl-3 italic text-amber-100/90">
            “{YEONGNYANGI_QUOTE}”
            <footer className="mt-1 not-italic text-xs text-amber-200/70">— 영냥이</footer>
          </blockquote>
        </div>

        {!pricing ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-amber-50/80">
            <p className="font-semibold text-amber-100">아직 준비 중인 생선이에요.</p>
            <p className="mt-1">이 상품은 코드 데스티니 결제 목록에 없어요. 영냥이 방으로 돌아가 다시 골라 주세요.</p>
            <a
              href={DEFAULT_RETURN_TO}
              className="mt-4 inline-flex rounded-full border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-200/10"
            >
              영냥이 방으로 돌아가기
            </a>
          </div>
        ) : (
          <div className="mt-8">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-amber-50/80">
              <dt className="text-amber-200/70">상품</dt>
              <dd>{pricing.featureKey}</dd>
              <dt className="text-amber-200/70">복채</dt>
              <dd className="font-semibold text-amber-100">{formatKrw(pricing.amountKRW)} · 단건 결제</dd>
            </dl>
            <button
              type="button"
              onClick={() => { void startPayment(); }}
              disabled={!authSettled || !signedIn || gate.phase === "paying" || gate.phase === "paid"}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-[#1a1408] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!authSettled
                ? "로그인 상태를 확인하고 있어요"
                : gate.phase === "paying"
                  ? "결제창을 여는 중이에요"
                  : gate.phase === "paid"
                    ? "결제 완료 · 영냥이 방으로 이동 중"
                    : `${formatKrw(pricing.amountKRW)} 단건 결제하기`}
            </button>
            {gate.phase === "cancelled" ? (
              <p className="mt-3 text-sm text-amber-50/75">결제를 취소했어요. 준비되면 다시 눌러 주세요.</p>
            ) : null}
            {gate.phase === "error" ? (
              <p className="mt-3 text-sm text-rose-200">{gate.message}</p>
            ) : null}
            <a href={params.returnTo} className="mt-4 inline-block text-xs text-amber-200/60 underline-offset-2 hover:underline">
              결제하지 않고 영냥이 방으로 돌아가기
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
