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
  { id: "sample",         title: "맛보기 한 줌",          amount: 3300,   points: 30   },
  { id: "luckyMeal",      title: "행운의 한 끼",           amount: 9900,   points: 115,  badge: "+15" },
  { id: "goldBarn",       title: "황금 돼지 곳간",          amount: 29000,  points: 360,  badge: "+60" },
  { id: "goldVault",      title: "황금 돼지 금고",          amount: 59000,  points: 880,  badge: "+180" },
  { id: "emperorReserve", title: "황금 돼지 제왕 보물고",    amount: 119000, points: 2000, badge: "🔥 BEST" },
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
  return `${Number(points || 0).toLocaleString("ko-KR")}코인`;
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
      <main className="flex min-h-screen items-center justify-center bg-[#fff9ef] text-[#5f2e08]">
        🐷 황금 돼지 저금통을 불러오는 중...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#fff9ef] via-[#ffe9cc] to-[#ffd8bd] px-4 py-8 text-[#5f2e08]">
      {/* 배경 광원 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 -left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,222,155,0.54)_0%,rgba(255,222,155,0)_72%)]" />
        <div className="absolute top-1/2 -right-1/4 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,180,100,0.28)_0%,rgba(255,180,100,0)_72%)]" />
      </div>

      {showStarBurst ? (
        <div className="pointer-events-none fixed inset-0 z-[90]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl animate-ping">🪙</div>
          <div className="absolute left-[42%] top-[44%] text-2xl animate-pulse">✨</div>
          <div className="absolute left-[57%] top-[43%] text-3xl animate-bounce">🐷</div>
          <div className="absolute left-[49%] top-[57%] text-2xl animate-ping">💰</div>
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-2xl space-y-5">
        {/* 헤더 */}
        <header className="rounded-3xl border border-[rgba(255,203,147,0.72)] bg-white/80 p-6 shadow-[0_12px_40px_rgba(43,5,29,0.14)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/icons/honeypig-96.webp"
                srcSet="/icons/honeypig-96.webp 96w, /icons/honeypig-130.webp 130w, /icons/honeypig.webp 512w"
                sizes="72px"
                width={72}
                height={72}
                alt="황금 돼지"
                className="rounded-2xl shadow-[0_6px_20px_rgba(150,76,11,0.22)]"
              />
              <div>
                <p className="text-[11px] font-bold tracking-[0.22em] text-[#a6450f] uppercase">Golden Pig Coin</p>
                <h1 className="mt-0.5 text-2xl font-bold text-[#812f00] sm:text-3xl">🐷✨ 황금 돼지 저금통 충전소</h1>
                <p className="mt-1 text-sm text-[#8b4b24]">💫 동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.</p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center self-start rounded-xl border border-[rgba(160,64,21,0.28)] bg-white/70 px-4 py-2 text-sm font-semibold text-[#7f3606] shadow-sm hover:bg-white transition-colors"
            >
              ← 운세 화면으로
            </Link>
          </div>
        </header>

        {/* 잔액 표시 */}
        <section className="rounded-2xl border border-[rgba(255,171,101,0.5)] bg-gradient-to-r from-[#fff8e8] to-[#fff0d6] p-5 shadow-[0_4px_20px_rgba(169,96,21,0.12)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_26%_22%,#fff8ce_0%,#ffd14d_48%,#df920b_100%)] shadow-[inset_0_2px_8px_rgba(255,255,255,0.56),0_4px_10px_rgba(150,76,11,0.24)]" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-bold tracking-wide text-[#8e5a2f] uppercase">황금 돼지 저금통</p>
                <p className="text-base font-bold text-[#742c16]">{authUser?.name || "사용자"} 님의 코인 지갑</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#8b4b24]">현재 보유</p>
              <p className="text-2xl font-black text-[#a6450f]">🪙 {Number(currentPoints).toLocaleString("ko-KR")}코인</p>
            </div>
          </div>
        </section>

        {/* 알림 */}
        {notice ? (
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.type === "success"
              ? "border-emerald-400/60 bg-emerald-50 text-emerald-800"
              : notice.type === "error"
                ? "border-rose-400/60 bg-rose-50 text-rose-800"
                : "border-amber-400/60 bg-amber-50 text-amber-900"
          }`}>
            {notice.text}
          </div>
        ) : null}

        {/* 패키지 선택 */}
        <section className="rounded-3xl border border-[rgba(255,203,147,0.72)] bg-white/90 p-5 shadow-[0_12px_40px_rgba(43,5,29,0.1)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#742c16]">충전 패키지 선택</h2>
            <span className="text-[11px] text-[#8b4b24]">패키지를 선택한 뒤 결제 수단을 고르세요.</span>
          </div>

          <div className="flex flex-col gap-3">
            {POINT_PACKAGES.map((pkg) => {
              const selected = selectedPackage.id === pkg.id;
              const isBest = pkg.id === "emperorReserve";
              const BASE_COINS: Record<string, number> = { sample: 30, luckyMeal: 100, goldBarn: 300, goldVault: 700, emperorReserve: 1500 };
              const baseCoins = BASE_COINS[pkg.id] ?? pkg.points;
              const bonusCoins = pkg.points - baseCoins;

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => { setSelectedPackage(pkg); setIsMethodModalOpen(true); }}
                  className={`relative w-full rounded-[18px] border p-4 text-left transition-all duration-200 ${
                    selected
                      ? "border-[rgba(245,124,0,0.95)] bg-gradient-to-r from-white to-[#fff3e0] shadow-[0_12px_22px_rgba(238,137,21,0.24)] -translate-y-0.5 scale-[1.01]"
                      : "border-[rgba(255,171,101,0.42)] bg-gradient-to-r from-white to-[#fffbf6] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(169,56,95,0.14)]"
                  }`}
                >
                  {isBest && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ff5f45] to-[#ff8c32] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_6px_14px_rgba(214,91,33,0.3)]">
                      🔥 BEST 혜택
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#742c16]">{pkg.title}</span>
                    <span className="font-black text-[#a6450f]">🪙 +{baseCoins.toLocaleString("ko-KR")}코인</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm text-[#7d4b2b]">{formatWon(pkg.amount)}</span>
                    <span className="text-sm font-bold text-[#8e4c11]">총 {pkg.points.toLocaleString("ko-KR")}코인 ✨</span>
                  </div>
                  {bonusCoins > 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-[rgba(251,177,74,0.25)] px-2.5 py-1 text-[12px] font-bold text-[#8d4a04]">
                      🎁 보너스 +{bonusCoins.toLocaleString("ko-KR")}코인
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] text-[#9b5a23]">
            ✅ 결제 완료 즉시 서버에서 금액 검증 후 코인이 반영됩니다. 👑 최상위 단계가 가장 큰 보너스를 제공합니다.
          </p>
        </section>

        {/* 결제 실패 안내 */}
        <section className="rounded-2xl border border-[rgba(255,171,101,0.4)] bg-[rgba(255,245,230,0.8)] p-5">
          <h3 className="font-bold text-[#742c16]">결제 실패 안내</h3>
          <ul className="mt-2 space-y-1 text-sm text-[#8b4b24]">
            <li>• 창 닫기/취소: 결제가 취소되어 코인이 차감되지 않습니다.</li>
            <li>• 한도 초과: 다른 카드/계좌이체 또는 금액을 낮춰 재시도해 주세요.</li>
            <li>• 카드사 점검: 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.</li>
          </ul>
        </section>
      </div>

      {/* 결제 수단 선택 모달 */}
      {isMethodModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(23,8,29,0.62)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[rgba(255,203,147,0.72)] bg-gradient-to-b from-[#fff9ef] to-[#ffe9cc] p-6 shadow-[0_22px_68px_rgba(43,5,29,0.38)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#a6450f] uppercase">결제 수단 선택</p>
                <h4 className="mt-0.5 text-lg font-bold text-[#742c16]">
                  {selectedPackage.title} · {selectedPackage.points.toLocaleString("ko-KR")}코인
                </h4>
                <p className="text-sm text-[#8b4b24]">{formatWon(selectedPackage.amount)}</p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsMethodModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(160,64,21,0.24)] bg-white/84 text-lg font-bold text-[#7f3606] hover:bg-white disabled:opacity-50"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const selected = method.id === selectedMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? "border-[rgba(245,124,0,0.9)] bg-[rgba(255,236,205,0.9)] shadow-[0_8px_18px_rgba(238,137,21,0.2)]"
                        : "border-[rgba(255,171,101,0.42)] bg-white/80 hover:border-[rgba(245,124,0,0.6)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{method.logo}</span>
                      <span className="font-semibold text-[#742c16]">{method.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#8b4b24]">{method.desc}</p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={startPayment}
              disabled={isProcessing}
              className="mt-5 w-full rounded-[14px] border-none bg-gradient-to-r from-[#ff7aaa] to-[#ffb15e] px-4 py-3.5 text-base font-black text-white shadow-[0_12px_22px_rgba(214,99,31,0.34)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_26px_rgba(214,99,31,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? "🐷 연결 중..." : "🪙 이 수단으로 결제 진행"}
            </button>
          </div>
        </div>
      ) : null}

      {/* 결제 처리 중 오버레이 */}
      {isProcessing ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(23,8,29,0.62)] backdrop-blur-sm">
          <div className="rounded-3xl border border-[rgba(255,203,147,0.72)] bg-[#fff9ef] px-8 py-7 text-center shadow-[0_22px_68px_rgba(43,5,29,0.38)]">
            <div className="mx-auto mb-3 text-5xl animate-bounce">🐷</div>
            <p className="font-bold text-[#742c16]">황금 돼지가 코인을 세고 있어요...</p>
            <p className="mt-1 text-sm text-[#8b4b24]">{processingText}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
