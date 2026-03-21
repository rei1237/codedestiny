"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  points?: number;
};

type PointPackage = {
  id: string;
  title: string;
  amount: number;
  points: number;
  badge?: string;
};

type PaymentMethodOption = {
  id: string;
  label: string;
  logo: string;
  desc: string;
  group: "domestic" | "global";
};

type PrepareOrderResponse = {
  message?: string;
  order?: {
    merchantUid: string;
    paymentAmount: number;
    chargePoints: number;
    productName: string;
  };
};

type ConfirmResponse = {
  message?: string;
  idempotent?: boolean;
  user?: {
    id: string;
    points: number;
  };
};

type MeResponse = {
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    points: number;
  };
};

type PendingOrder = {
  merchantUid: string;
  paymentAmount: number;
  chargePoints: number;
  paymentMethod: string;
};

type PortOnePaymentResponse = {
  success?: boolean;
  imp_uid?: string;
  error_msg?: string;
  errorMsg?: string;
};

declare global {
  interface Window {
    IMP?: {
      init: (impCode: string) => void;
      request_pay: (data: Record<string, unknown>, callback: (rsp: PortOnePaymentResponse) => void) => void;
    };
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

const PORTONE_IMP_CODE = process.env.NEXT_PUBLIC_PORTONE_IMP_CODE || "imp00000000";

const POINT_PACKAGES: PointPackage[] = [
  { id: "pkg_5000", title: "초승달 패키지", amount: 5000, points: 5000 },
  { id: "pkg_10000", title: "보랏빛 오로라 패키지", amount: 10000, points: 10000, badge: "인기" },
  { id: "pkg_30000", title: "은하수 마스터 패키지", amount: 30000, points: 32000, badge: "+2,000P" },
];

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "kakao", label: "카카오페이", logo: "🟨", desc: "간편 결제", group: "domestic" },
  { id: "toss_card", label: "토스페이먼츠(카드)", logo: "💳", desc: "국내 카드", group: "domestic" },
  { id: "toss_transfer", label: "토스페이먼츠(계좌이체)", logo: "🏦", desc: "실시간 이체", group: "domestic" },
  { id: "naverpay", label: "네이버페이", logo: "🟩", desc: "네이버 간편 결제", group: "domestic" },
  { id: "card_general", label: "일반 신용카드", logo: "💠", desc: "다날/나이스 등", group: "domestic" },
  { id: "paypal", label: "PayPal", logo: "🅿️", desc: "해외 결제", group: "global" },
  { id: "applepay", label: "Apple Pay", logo: "🍎", desc: "포트원 지원 PG 기준", group: "global" },
  { id: "googlepay", label: "Google Pay", logo: "🟢", desc: "포트원 지원 PG 기준", group: "global" },
];

function formatPoints(points: number) {
  return `${Number(points || 0).toLocaleString("ko-KR")}P`;
}

function formatWon(amount: number) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function mapPaymentErrorMessage(rawMessage: string) {
  const text = String(rawMessage || "").toLowerCase();

  if (text.includes("취소") || text.includes("cancel")) {
    return "결제가 취소되었습니다. 원하실 때 다시 시도하실 수 있어요.";
  }

  if (text.includes("한도") || text.includes("limit")) {
    return "결제 한도 초과로 진행되지 않았습니다. 다른 카드나 결제수단을 이용해 주세요.";
  }

  if (text.includes("점검") || text.includes("maintenance") || text.includes("unavailable")) {
    return "카드사/PG 점검 시간으로 결제가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "결제를 완료하지 못했습니다. 네트워크 상태와 결제 정보를 확인 후 다시 시도해 주세요.";
}

function ensurePortoneSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제를 진행할 수 있습니다."));
      return;
    }

    if (window.IMP) {
      resolve();
      return;
    }

    const scriptId = "portone-iamport-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("결제 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.iamport.kr/v1/iamport.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 SDK를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

function resolvePgConfig(methodId: string) {
  const overrides = {
    kakao: process.env.NEXT_PUBLIC_PORTONE_PG_KAKAO,
    toss_card: process.env.NEXT_PUBLIC_PORTONE_PG_TOSS_CARD,
    toss_transfer: process.env.NEXT_PUBLIC_PORTONE_PG_TOSS_TRANSFER,
    naverpay: process.env.NEXT_PUBLIC_PORTONE_PG_NAVERPAY,
    card_general: process.env.NEXT_PUBLIC_PORTONE_PG_CARD,
    paypal: process.env.NEXT_PUBLIC_PORTONE_PG_PAYPAL,
    applepay: process.env.NEXT_PUBLIC_PORTONE_PG_APPLEPAY,
    googlepay: process.env.NEXT_PUBLIC_PORTONE_PG_GOOGLEPAY,
  } as Record<string, string | undefined>;

  const defaults: Record<string, { pg: string; payMethod: string }> = {
    kakao: { pg: overrides.kakao || "kakaopay.TC0ONETIME", payMethod: "card" },
    toss_card: { pg: overrides.toss_card || "tosspayments", payMethod: "card" },
    toss_transfer: { pg: overrides.toss_transfer || "tosspayments", payMethod: "trans" },
    naverpay: { pg: overrides.naverpay || "naverpay", payMethod: "card" },
    card_general: { pg: overrides.card_general || "html5_inicis.INIpayTest", payMethod: "card" },
    paypal: { pg: overrides.paypal || "paypal", payMethod: "paypal" },
    applepay: { pg: overrides.applepay || "tosspayments", payMethod: "card" },
    googlepay: { pg: overrides.googlepay || "tosspayments", payMethod: "card" },
  };

  return defaults[methodId] || defaults.card_general;
}

function readPendingOrder() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("fortune_pending_order");
    if (!raw) return null;
    return JSON.parse(raw) as PendingOrder;
  } catch {
    return null;
  }
}

function savePendingOrder(order: PendingOrder) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fortune_pending_order", JSON.stringify(order));
}

function clearPendingOrder() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fortune_pending_order");
}

export default function PointsPage() {
  const router = useRouter();

  const redirectHandledRef = useRef(false);

  const apiBase = useMemo(() => {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return window.CODE_DESTINY_API_BASE_URL;
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:4000";
      }
      return window.location.origin;
    }
    return "http://localhost:4000";
  }, []);

  const [token, setToken] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage>(POINT_PACKAGES[1]);
  const [selectedMethod, setSelectedMethod] = useState<string>("kakao");

  const [isBooting, setIsBooting] = useState(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("신비로운 기운으로 결제를 연결 중입니다...");
  const [notice, setNotice] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [showStarBurst, setShowStarBurst] = useState(false);

  const persistUserPoints = useCallback((points: number) => {
    setCurrentPoints(points);

    try {
      const raw = localStorage.getItem("fortune_auth_user");
      if (!raw) return;
      const user = JSON.parse(raw);
      user.points = points;
      localStorage.setItem("fortune_auth_user", JSON.stringify(user));
    } catch {
      // noop
    }
  }, []);

  const fetchMyPointState = useCallback(
    async (authToken: string) => {
      const response = await fetch(`${apiBase}/api/payments/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const payload = (await response.json()) as MeResponse;

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("fortune_auth_token");
        localStorage.removeItem("fortune_auth_user");
        router.replace("/login?next=%2Fpoints");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message || "포인트 정보를 불러오지 못했습니다.");
      }

      const points = Number(payload.user?.points || 0);
      persistUserPoints(points);

      if (payload.user) {
        setAuthUser((prev) => ({
          ...(prev || {}),
          id: payload.user!.id,
          name: payload.user!.name,
          email: payload.user!.email,
          points,
        }));
      }
    },
    [apiBase, persistUserPoints, router],
  );

  useEffect(() => {
    const savedToken = localStorage.getItem("fortune_auth_token");
    const rawUser = localStorage.getItem("fortune_auth_user");

    if (!savedToken) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    setToken(savedToken);

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as AuthUser;
        setAuthUser(parsed);
        if (typeof parsed.points === "number") setCurrentPoints(parsed.points);
      } catch {
        // noop
      }
    }

    setIsBooting(false);
  }, [router]);

  useEffect(() => {
    if (isBooting || !token) return;

    fetchMyPointState(token).catch((error) => {
      setNotice({ type: "error", text: error.message || "포인트 정보를 불러오지 못했습니다." });
    });
  }, [fetchMyPointState, isBooting, token]);

  const confirmPaymentWithServer = useCallback(
    async (params: {
      impUid: string;
      merchantUid?: string;
      paymentAmount?: number;
      chargePoints?: number;
      paymentMethod?: string;
    }) => {
      const body: Record<string, unknown> = {
        impUid: params.impUid,
        merchantUid: params.merchantUid,
        paymentMethod: params.paymentMethod,
      };

      if (Number.isInteger(params.paymentAmount)) {
        body.paymentAmount = params.paymentAmount;
      }

      if (Number.isInteger(params.chargePoints)) {
        body.chargePoints = params.chargePoints;
      }

      const response = await fetch(`${apiBase}/api/payments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as ConfirmResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "서버 결제 검증에 실패했습니다.");
      }

      return payload;
    },
    [apiBase, token],
  );

  const handleConfirmSuccess = useCallback(
    async (result: ConfirmResponse, fromRedirect = false) => {
      const points = Number(result.user?.points || 0);
      persistUserPoints(points);
      setNotice({
        type: "success",
        text: fromRedirect
          ? "모바일 결제 복귀 확인이 완료되었습니다. 포인트가 정상 충전되었어요 ✨"
          : (result.message || "결제가 완료되어 포인트가 충전되었습니다 ✨"),
      });
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
      await fetchMyPointState(token);
    },
    [fetchMyPointState, persistUserPoints, token],
  );

  useEffect(() => {
    if (isBooting || !token || redirectHandledRef.current) return;

    if (typeof window === "undefined") return;

    const query = new URLSearchParams(window.location.search);
    const impUid = query.get("imp_uid");
    if (!impUid) return;

    redirectHandledRef.current = true;

    const merchantUidFromQuery = query.get("merchant_uid") || undefined;
    const pending = readPendingOrder();

    setIsProcessing(true);
    setProcessingText("모바일 결제 복귀 신호를 확인하고 있습니다...");

    confirmPaymentWithServer({
      impUid,
      merchantUid: merchantUidFromQuery || pending?.merchantUid,
      paymentAmount: pending?.paymentAmount,
      chargePoints: pending?.chargePoints,
      paymentMethod: pending?.paymentMethod,
    })
      .then(async (result) => {
        clearPendingOrder();
        await handleConfirmSuccess(result, true);
      })
      .catch((error) => {
        setNotice({ type: "error", text: error.message || "모바일 결제 검증에 실패했습니다." });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  }, [confirmPaymentWithServer, handleConfirmSuccess, isBooting, token]);

  const startPayment = async () => {
    if (!token || !authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    setNotice(null);
    setIsProcessing(true);
    setProcessingText("신비로운 기운으로 결제를 연결 중입니다...");

    try {
      const prepareResponse = await fetch(`${apiBase}/api/payments/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentAmount: selectedPackage.amount,
          chargePoints: selectedPackage.points,
          paymentMethod: selectedMethod,
          productName: `${selectedPackage.title} (${formatPoints(selectedPackage.points)})`,
        }),
      });

      const preparePayload = (await prepareResponse.json()) as PrepareOrderResponse & { message?: string };
      if (!prepareResponse.ok || !preparePayload.order) {
        throw new Error(preparePayload.message || "결제 준비에 실패했습니다.");
      }

      const order = preparePayload.order;
      savePendingOrder({
        merchantUid: order.merchantUid,
        paymentAmount: order.paymentAmount,
        chargePoints: order.chargePoints,
        paymentMethod: selectedMethod,
      });

      await ensurePortoneSdk();

      if (!window.IMP) {
        throw new Error("포트원 결제 SDK가 초기화되지 않았습니다.");
      }

      const pgConfig = resolvePgConfig(selectedMethod);
      window.IMP.init(PORTONE_IMP_CODE);

      const requestData: Record<string, unknown> = {
        pg: pgConfig.pg,
        pay_method: pgConfig.payMethod,
        merchant_uid: order.merchantUid,
        name: order.productName,
        amount: order.paymentAmount,
        buyer_name: authUser.name || "회원",
        buyer_email: authUser.email || "",
        m_redirect_url: `${window.location.origin}/points`,
        custom_data: {
          userId: authUser.id,
          packageId: selectedPackage.id,
          chargePoints: order.chargePoints,
          paymentMethod: selectedMethod,
        },
      };

      await new Promise<void>((resolve) => {
        window.IMP!.request_pay(requestData, async (rsp: PortOnePaymentResponse) => {
          if (!rsp || !rsp.success) {
            const message = mapPaymentErrorMessage(rsp?.error_msg || rsp?.errorMsg || "결제가 취소되었습니다.");
            setNotice({ type: "error", text: message });
            setIsProcessing(false);
            resolve();
            return;
          }

          try {
            setProcessingText("결제 검증 및 포인트 정산을 진행하고 있습니다...");
            const result = await confirmPaymentWithServer({
              impUid: rsp.imp_uid,
              merchantUid: order.merchantUid,
              paymentAmount: order.paymentAmount,
              chargePoints: order.chargePoints,
              paymentMethod: selectedMethod,
            });

            clearPendingOrder();
            await handleConfirmSuccess(result);
            setIsMethodModalOpen(false);
          } catch (error: unknown) {
            setNotice({ type: "error", text: getErrorMessage(error, "결제 검증에 실패했습니다.") });
          } finally {
            setIsProcessing(false);
            resolve();
          }
        });
      });
    } catch (error: unknown) {
      setIsProcessing(false);
      setNotice({ type: "error", text: getErrorMessage(error, "결제를 시작하지 못했습니다.") });
    }
  };

  if (isBooting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        포인트 충전 정보를 불러오는 중...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#090b1d] via-[#1a103a] to-[#2b0e46] px-4 py-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px] opacity-30 animate-twinkle" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.25),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.25),transparent_35%)]" />

      {showStarBurst ? (
        <div className="pointer-events-none fixed inset-0 z-[90]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-yellow-200 animate-ping">✦</div>
          <div className="absolute left-[42%] top-[44%] text-2xl text-fuchsia-200 animate-pulse">✧</div>
          <div className="absolute left-[57%] top-[43%] text-3xl text-violet-200 animate-pulse">✦</div>
          <div className="absolute left-[49%] top-[57%] text-2xl text-indigo-200 animate-ping">✧</div>
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-4xl space-y-5">
        <header className="rounded-2xl border border-violet-300/25 bg-slate-950/55 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.28em] text-violet-200">TWILIGHT POINT ALTAR</p>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">신비로운 포인트 충전소</h1>
              <p className="mt-1 text-sm text-violet-100/80">포트원 통합 결제로 포인트를 충전하고 운세를 이어보세요.</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-violet-300/40 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/25"
            >
              운세 화면으로 돌아가기
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-300/35 bg-gradient-to-r from-amber-200/10 via-yellow-200/8 to-violet-200/10 p-5 shadow-[0_0_28px_rgba(234,179,8,0.16)] backdrop-blur-md">
          <p className="text-xs tracking-[0.22em] text-amber-200/90">PROFILE CRYSTAL</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-violet-100">{authUser?.name || "사용자"} 님의 별빛 지갑</p>
              <p className="text-sm text-violet-200/80">결제 완료 즉시 포인트가 반영됩니다.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-violet-200/80">현재 보유 포인트</p>
              <p className="text-3xl font-extrabold text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,.75)]">{formatPoints(currentPoints)}</p>
            </div>
          </div>
        </section>

        {notice ? (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              : notice.type === "error"
                ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                : "border-violet-300/40 bg-violet-500/10 text-violet-100"
          }`}>
            {notice.text}
          </div>
        ) : null}

        <section className="rounded-2xl border border-violet-300/25 bg-slate-950/55 p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-violet-100">충전 패키지 선택</h2>
            <span className="text-xs text-violet-200/80">원하는 패키지를 선택한 뒤 결제 수단을 고르세요.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {POINT_PACKAGES.map((pkg) => {
              const selected = selectedPackage.id === pkg.id;

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setIsMethodModalOpen(true);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                    selected
                      ? "border-violet-300/70 bg-violet-500/18 shadow-[0_0_22px_rgba(167,139,250,.4)]"
                      : "border-violet-300/25 bg-slate-900/55 hover:border-violet-300/55 hover:shadow-[0_0_18px_rgba(167,139,250,.28)]"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <span className="absolute left-[8%] top-[14%] text-violet-200/80 animate-pulse">✦</span>
                    <span className="absolute left-[72%] top-[22%] text-fuchsia-200/80 animate-pulse">✧</span>
                    <span className="absolute left-[46%] top-[60%] text-indigo-200/80 animate-ping">✦</span>
                  </div>

                  <div className="relative">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-violet-100">{pkg.title}</p>
                      {pkg.badge ? (
                        <span className="rounded-full border border-amber-300/50 bg-amber-200/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                          {pkg.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-2xl font-extrabold text-white">{formatPoints(pkg.points)}</p>
                    <p className="mt-1 text-sm text-violet-100/80">{formatWon(pkg.amount)}</p>
                    <p className="mt-3 text-xs text-violet-200/70">마우스를 올리면 별빛이 내려앉는 패키지 카드 ✨</p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-violet-200/75">
            결제 이후 서버에서 포트원 결제 정보를 재조회해 금액 위변조를 검증한 뒤 포인트를 반영합니다.
          </p>
        </section>

        <section className="rounded-2xl border border-violet-300/25 bg-slate-950/55 p-5 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-violet-100">결제 실패 안내</h3>
          <ul className="mt-2 space-y-1 text-sm text-violet-100/85">
            <li>• 창 닫기/취소: 결제가 취소되어 포인트가 차감되지 않습니다.</li>
            <li>• 한도 초과: 다른 카드/계좌이체 또는 금액을 낮춰 재시도해 주세요.</li>
            <li>• 카드사 점검: 잠시 후 다시 시도하거나 다른 PG를 선택해 주세요.</li>
          </ul>
        </section>
      </div>

      {isMethodModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-violet-300/40 bg-gradient-to-b from-[#11122c] to-[#1d1438] p-5 shadow-[0_20px_70px_rgba(76,29,149,.5)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.22em] text-violet-300">PAYMENT METHOD</p>
                <h4 className="mt-1 text-xl font-bold text-white">결제 수단 선택</h4>
                <p className="mt-1 text-sm text-violet-100/80">
                  {selectedPackage.title} · {formatPoints(selectedPackage.points)} ({formatWon(selectedPackage.amount)})
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsMethodModalOpen(false)}
                className="rounded-lg border border-violet-300/35 bg-slate-800/55 px-3 py-1.5 text-sm text-violet-100 hover:bg-slate-700/65 disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const selected = method.id === selectedMethod;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? "border-violet-300 bg-violet-500/20 shadow-[0_0_20px_rgba(167,139,250,.45)]"
                        : "border-violet-300/25 bg-slate-900/55 hover:border-violet-300/55"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg">{method.logo}</span>
                      <span className="font-semibold text-violet-100">{method.label}</span>
                    </div>
                    <p className="text-xs text-violet-200/80">{method.desc}</p>
                    <p className="mt-1 text-[11px] text-violet-300/70">
                      {method.group === "domestic" ? "국내 결제" : "해외 결제"}
                    </p>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-violet-200/70">
              선택된 수단에 따라 `pg` 파라미터가 자동 분기됩니다. (IMP 코드: {PORTONE_IMP_CODE})
            </p>

            <button
              type="button"
              onClick={startPayment}
              disabled={isProcessing}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-violet-200/45 bg-gradient-to-r from-violet-600/85 via-fuchsia-600/80 to-indigo-600/85 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(76,29,149,.4)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? "결제 연결 중..." : "이 수단으로 결제 진행"}
            </button>
          </div>
        </div>
      ) : null}

      {isProcessing ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#020617]/72 backdrop-blur-sm">
          <div className="rounded-2xl border border-violet-300/45 bg-[#120f2f]/92 px-7 py-6 text-center shadow-[0_0_28px_rgba(168,85,247,.45)]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-violet-300/65 bg-violet-500/25">
              <div className="h-9 w-9 rounded-full border-2 border-violet-200 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-semibold text-violet-100">신비로운 기운으로 결제를 연결 중입니다...</p>
            <p className="mt-1 text-xs text-violet-200/80">{processingText}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
