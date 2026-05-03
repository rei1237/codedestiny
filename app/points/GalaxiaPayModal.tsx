"use client";

/**
 * GalaxiaPayModal.tsx
 * 포트원(PortOne) V1 IMP SDK + 갤럭시아머니트리 PG 기반 결제창 모달
 * - 카드사 사전 선택 UI (IMP.request_pay에 bypass로 전달)
 * - 할부 선택 지원
 * - 간편결제(카카오/토스/네이버) 탭 별도 PG 연동
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── 타입 ──────────────────────────────────────────────────── */
export type PointPackage = {
  id: string;
  title: string;
  amount: number;
  points: number;
};

export type GalaxiaPayResult = {
  success: boolean;
  imp_uid?: string;   // PortOne imp_uid
  orderId?: string;   // merchant_uid
  errorCode?: string;
  errorMsg?: string;
};

type Props = {
  pkg: PointPackage;
  buyerName: string;
  buyerEmail: string;
  orderId: string;          // 서버에서 발급한 주문번호
  initialPayType?: "card" | "simple";
  initialCardId?: string;
  onSuccess: (res: GalaxiaPayResult) => void;
  onFail: (res: GalaxiaPayResult) => void;
  onClose: () => void;
  isProcessing?: boolean;
};

/* ─── 카드사 목록 ────────────────────────────────────────────── */
const CARD_LIST = [
  { id: "04", name: "국민", logo: "KB" },
  { id: "11", name: "BC", logo: "BC" },
  { id: "20", name: "우리", logo: "우리" },
  { id: "31", name: "삼성", logo: "삼성" },
  { id: "41", name: "하나", logo: "하나" },
  { id: "43", name: "현대", logo: "현대" },
  { id: "45", name: "농협", logo: "NH" },
  { id: "48", name: "신한", logo: "신한" },
  { id: "54", name: "AX", logo: "AX" },
  { id: "62", name: "카카오뱅크", logo: "카카오" },
  { id: "96", name: "롯데", logo: "롯데" },
  { id: "artmoney", name: "아트머니", logo: "AM" },
  { id: "kakao", name: "카카오페이", logo: "🟨" },
  { id: "toss",  name: "토스페이",   logo: "TOSS" },
  { id: "naver", name: "네이버페이", logo: "🟩" },
];

/* ─── 할부 옵션 ─────────────────────────────────────────────── */
const INSTALLMENT_OPTIONS = [
  { value: "00", label: "일시불" },
  { value: "02", label: "2개월" },
  { value: "03", label: "3개월" },
  { value: "06", label: "6개월" },
  { value: "12", label: "12개월" },
];

/* ─── 포트원 IMP 타입 ────────────────────────────────────────── */
type PortOneRsp = {
  success?: boolean;
  imp_uid?: string;
  merchant_uid?: string;
  error_msg?: string;
  error_code?: string;
};

declare global {
  interface Window {
    IMP?: {
      init: (impCode: string) => void;
      request_pay: (
        data: Record<string, unknown>,
        callback: (rsp: PortOneRsp) => void,
      ) => void;
    };
  }
}

/* ─── 포트원 SDK 로드 ────────────────────────────────────────── */
function ensurePortoneSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제를 진행할 수 있습니다."));
      return;
    }
    if (window.IMP) { resolve(); return; }
    const scriptId = "portone-iamport-sdk";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("결제 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = scriptId;
    s.src = "https://cdn.iamport.kr/v1/iamport.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("결제 SDK를 불러오지 못했습니다."));
    document.body.appendChild(s);
  });
}

/* ─── 간편결제 ID 목록 ───────────────────────────────────────── */
const SIMPLE_PAY_IDS = ["artmoney", "kakao", "toss", "naver"];

export default function GalaxiaPayModal({
  pkg,
  buyerName,
  buyerEmail,
  orderId,
  initialPayType = "card",
  initialCardId = "",
  onSuccess,
  onFail,
  onClose,
  isProcessing = false,
}: Props) {
  const [selectedCard, setSelectedCard] = useState<string>(initialCardId);
  const [installment, setInstallment] = useState("00");
  const [payType, setPayType] = useState<"card" | "simple">(initialPayType);
  const [isLaunching, setIsLaunching] = useState(false);
  const launchedRef = useRef(false);

  useEffect(() => {
    setPayType(initialPayType);
    setSelectedCard(initialCardId);
  }, [initialCardId, initialPayType]);

  /* 간편결제 선택 시 탭 자동 전환 */
  useEffect(() => {
    if (SIMPLE_PAY_IDS.includes(selectedCard)) setPayType("simple");
    else if (selectedCard) setPayType("card");
  }, [selectedCard]);

  const handlePay = useCallback(async () => {
    if (launchedRef.current || isProcessing || isLaunching) return;
    launchedRef.current = true;
    setIsLaunching(true);

    try {
      await ensurePortoneSdk();

      if (!window.IMP) throw new Error("포트원 결제 SDK가 초기화되지 않았습니다.");

      const impCode = process.env.NEXT_PUBLIC_PORTONE_IMP_CODE || "imp00000000";
      const galaxiaMid = process.env.NEXT_PUBLIC_GALAXIA_MID || "";
      const galaxiaPg = process.env.NEXT_PUBLIC_PORTONE_PG_GALAXIA
        || (galaxiaMid ? `galaxia.${galaxiaMid}` : "galaxia");
      window.IMP.init(impCode);

      let pg: string;
      let payMethod: string;
      const extra: Record<string, unknown> = {};

      if (payType === "simple") {
        /* 간편결제: 각 PG 직접 연동 */
        if (selectedCard === "artmoney") {
          pg = process.env.NEXT_PUBLIC_PORTONE_PG_GALAXIA_ARTMONEY || galaxiaPg;
          payMethod = process.env.NEXT_PUBLIC_PORTONE_PAY_METHOD_GALAXIA_ARTMONEY || "card";
        } else if (selectedCard === "kakao") {
          pg = process.env.NEXT_PUBLIC_PORTONE_PG_KAKAO || "kakaopay";
          payMethod = "card";
        } else if (selectedCard === "toss") {
          pg = process.env.NEXT_PUBLIC_PORTONE_PG_TOSSPAY || "tosspay";
          payMethod = "card";
        } else if (selectedCard === "naver") {
          pg = process.env.NEXT_PUBLIC_PORTONE_PG_NAVERPAY || "naverpay";
          payMethod = "card";
        } else {
          /* 간편결제 수단 미선택 시 기본 아트머니 */
          pg = process.env.NEXT_PUBLIC_PORTONE_PG_GALAXIA_ARTMONEY || galaxiaPg;
          payMethod = "card";
        }
      } else {
        /* 신용/체크카드: 갤럭시아머니트리 PG */
        pg = galaxiaPg;
        payMethod = "card";

        /* 카드사 사전 선택 — bypass로 갤럭시아에 전달 */
        if (selectedCard) {
          extra.bypass = {
            galaxia: { P_CARD_OPTION: `selcode=${selectedCard}:direct:Y` },
          };
        }

        /* 할부 옵션 */
        if (installment !== "00") {
          extra.display = { card_quota: [parseInt(installment, 10)] };
        }
      }

      const mRedirectUrl = new URL("/points", window.location.origin);
      mRedirectUrl.searchParams.set("portone_redirect", "1");

      window.IMP.request_pay(
        {
          pg,
          pay_method: payMethod,
          merchant_uid: orderId,
          name: pkg.title,
          amount: pkg.amount,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          m_redirect_url: mRedirectUrl.toString(),
          ...extra,
        },
        (rsp) => {
          launchedRef.current = false;
          setIsLaunching(false);
          if (rsp.success) {
            onSuccess({
              success: true,
              imp_uid: rsp.imp_uid,
              orderId: rsp.merchant_uid,
            });
          } else {
            onFail({
              success: false,
              errorCode: rsp.error_code,
              errorMsg: rsp.error_msg,
            });
          }
        },
      );
    } catch (err) {
      launchedRef.current = false;
      setIsLaunching(false);
      onFail({
        success: false,
        errorMsg: err instanceof Error ? err.message : "결제창을 열지 못했습니다.",
      });
    }
  }, [buyerEmail, buyerName, installment, isLaunching, isProcessing, onFail, onSuccess, orderId, payType, pkg.amount, pkg.title, selectedCard]);

  const fmtWon = (n: number) => `${n.toLocaleString("ko-KR")}원`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isLaunching && !isProcessing) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-[0_-8px_60px_rgba(0,0,0,0.35)] sm:shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
        {/* 골드 식별바 */}
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg,#A0680A 0%,#FFD060 30%,#fff 50%,#FFD060 70%,#A0680A 100%)" }} />

        <div className="bg-white px-5 pb-6 pt-5 max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-amber-700">결제하실 금액</p>
              <h3 className="mt-0.5 text-[18px] font-black text-gray-800">{pkg.title}</h3>
              <p className="text-[22px] font-black text-amber-700 leading-tight">{fmtWon(pkg.amount)}</p>
              <p className="text-[11.5px] text-gray-500 mt-0.5">{pkg.points.toLocaleString("ko-KR")}코인 충전</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLaunching || isProcessing}
              className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              aria-label="닫기"
            >×</button>
          </div>

          {/* 탭: 카드결제 / 간편결제 */}
          <div className="mb-4 flex rounded-xl overflow-hidden border border-gray-200">
            {(["card", "simple"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setPayType(t); setSelectedCard(""); }}
                className={[
                  "flex-1 py-2.5 text-[13px] font-bold transition-colors",
                  payType === t
                    ? "bg-amber-500 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50",
                ].join(" ")}
              >
                {t === "card" ? "💳 카드결제" : "⚡ 간편결제"}
              </button>
            ))}
          </div>

          {/* 카드 결제: 카드사 선택 */}
          {payType === "card" && (
            <div className="mb-4">
              <p className="mb-2.5 text-[12px] font-bold text-gray-700">결제하실 카드를 선택해 주세요</p>
              <div className="grid grid-cols-4 gap-2">
                {CARD_LIST.filter((c) => !SIMPLE_PAY_IDS.includes(c.id)).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCard(card.id === selectedCard ? "" : card.id)}
                    className={[
                      "flex flex-col items-center justify-center rounded-[14px] border p-2.5 text-center transition-all",
                      selectedCard === card.id
                        ? "border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(180,130,30,0.25)]"
                        : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50",
                    ].join(" ")}
                  >
                    <span className="text-[11px] font-black text-gray-700 leading-tight">{card.logo}</span>
                    <span className="mt-0.5 text-[10px] text-gray-500">{card.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedCard("")}
                  className={[
                    "flex flex-col items-center justify-center rounded-[14px] border p-2.5 text-center transition-all col-span-1",
                    selectedCard === ""
                      ? "border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(180,130,30,0.25)]"
                      : "border-gray-200 bg-white hover:border-amber-300",
                  ].join(" ")}
                >
                  <span className="text-[11px] font-black text-gray-600">전체</span>
                  <span className="mt-0.5 text-[10px] text-gray-400">모든 카드</span>
                </button>
              </div>

              {/* 할부 선택 */}
              <div className="mt-3">
                <p className="mb-1.5 text-[12px] font-bold text-gray-700">할부 선택</p>
                <div className="flex flex-wrap gap-2">
                  {INSTALLMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInstallment(opt.value)}
                      className={[
                        "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
                        installment === opt.value
                          ? "bg-amber-500 text-white shadow-[0_3px_10px_rgba(180,130,30,0.35)]"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10.5px] text-gray-400">* 무이자할부: 법인/기업/체크/선불/GIFT/운행계열카드 제외</p>
              </div>
            </div>
          )}

          {/* 간편결제: 간편결제사 선택 */}
          {payType === "simple" && (
            <div className="mb-4">
              <p className="mb-2.5 text-[12px] font-bold text-gray-700">간편결제 수단을 선택해 주세요</p>
              <div className="grid grid-cols-3 gap-2">
                {CARD_LIST.filter((c) => SIMPLE_PAY_IDS.includes(c.id)).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCard(card.id === selectedCard ? "" : card.id)}
                    className={[
                      "flex flex-col items-center justify-center rounded-[14px] border p-3 text-center transition-all",
                      selectedCard === card.id
                        ? "border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(180,130,30,0.25)]"
                        : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50",
                    ].join(" ")}
                  >
                    <span className="text-[16px] leading-none">{card.logo}</span>
                    <span className="mt-1 text-[11px] font-bold text-gray-700">{card.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 결제 요약 */}
          <div className="mb-4 rounded-[14px] border border-gray-200 bg-gray-50 px-4 py-3.5 space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">상품명</span>
              <span className="font-semibold text-gray-800">{pkg.title}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">결제금액</span>
              <span className="font-black text-amber-700 text-[15px]">{fmtWon(pkg.amount)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">충전 코인</span>
              <span className="font-bold text-gray-800">{pkg.points.toLocaleString("ko-KR")}코인</span>
            </div>
            {payType === "card" && installment !== "00" && (
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">할부</span>
                <span className="font-semibold text-gray-800">{INSTALLMENT_OPTIONS.find((o) => o.value === installment)?.label}</span>
              </div>
            )}
          </div>

          {/* 결제 버튼 */}
          <button
            type="button"
            onClick={handlePay}
            disabled={isLaunching || isProcessing}
            className="w-full rounded-[16px] bg-gradient-to-r from-amber-500 to-yellow-400 py-4 text-[15px] font-black text-white shadow-[0_8px_24px_rgba(180,130,20,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(180,130,20,0.5)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLaunching ? "결제창 여는 중..." : `${fmtWon(pkg.amount)} 결제하기`}
          </button>

          <p className="mt-3 text-center text-[11px] text-gray-400">
            결제 완료 후 즉시 코인이 충전됩니다. · 포트원(PortOne) 보안 결제
          </p>
        </div>
      </div>
    </div>
  );
}
