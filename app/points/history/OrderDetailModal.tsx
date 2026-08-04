"use client";

import { useEffect, useRef } from "react";
import type { LoadingLocale } from "@/constants/loadingMessages";
import type { OrderDetailViewModel } from "./order-view-model";

type Props = {
  locale: LoadingLocale;
  order: OrderDetailViewModel | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
};

const COPY = {
  ko: {
    close: "닫기",
    detail: "주문 상세",
    date: "결제 일시",
    amount: "결제 금액",
    method: "결제 방식",
    order: "주문번호",
    approval: "승인번호",
    benefit: "지급된 상품 또는 이용권",
    receipt: "영수증 보기",
    retry: "상태 다시 확인",
    support: "고객센터 문의",
    loading: "주문 상세를 확인하는 중이에요.",
    failed: "주문 상세를 확인하지 못했어요.",
  },
  en: {
    close: "Close",
    detail: "Order details",
    date: "Paid at",
    amount: "Amount",
    method: "Payment method",
    order: "Order number",
    approval: "Approval number",
    benefit: "Granted product or pass",
    receipt: "View receipt",
    retry: "Check status again",
    support: "Contact support",
    loading: "Checking order details.",
    failed: "Unable to load order details.",
  },
} as const;

export default function OrderDetailModal({ locale, order, loading, error, onRetry, onClose }: Props) {
  const copy = locale === "ko" ? COPY.ko : COPY.en;
  const closeRef = useRef<HTMLButtonElement>(null);
  const purchasedAt = order ? (() => {
    const date = new Date(order.purchasedAt);
    return Number.isNaN(date.getTime()) ? order.purchasedAt : date.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
  })() : "";

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="max-h-[min(90vh,720px)] w-full overflow-y-auto rounded-t-[28px] border border-[#EDDBA3] bg-[#FFFDF7] p-5 text-[#5C3A1E] shadow-2xl sm:max-w-lg sm:rounded-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-800">Moonlight Order</p>
            <h2 id="order-detail-title" className="mt-1 text-lg font-black">{order?.title || copy.detail}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-full border border-[#EDDBA3] bg-white px-3 text-sm font-bold" aria-label={copy.close}>×</button>
        </div>

        {loading ? <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm" aria-live="polite">{copy.loading}</p> : null}
        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="text-sm font-semibold text-rose-700">{error || copy.failed}</p>
            <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white">{copy.retry}</button>
          </div>
        ) : null}

        {order && !loading && !error ? (
          <>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-sm font-bold">{copy.detail}</span>
              <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black">{order.statusLabel}</span>
            </div>
            <dl className="mt-4 grid gap-3 rounded-2xl border border-[#EDDBA3]/80 bg-white p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">{copy.date}</dt><dd className="text-right font-semibold">{purchasedAt}</dd></div>
              {order.amount ? <div className="flex justify-between gap-4"><dt className="text-neutral-500">{copy.amount}</dt><dd className="font-semibold">{order.amount.value.toLocaleString()} {order.amount.currency}</dd></div> : null}
              {order.paymentMethod ? <div className="flex justify-between gap-4"><dt className="text-neutral-500">{copy.method}</dt><dd className="text-right font-semibold">{order.paymentMethod}</dd></div> : null}
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">{copy.order}</dt><dd className="font-mono text-xs font-semibold">{order.orderNumberMasked}</dd></div>
              {order.approvalNumberMasked ? <div className="flex justify-between gap-4"><dt className="text-neutral-500">{copy.approval}</dt><dd className="font-mono text-xs font-semibold">{order.approvalNumberMasked}</dd></div> : null}
            </dl>
            {order.entitlements.length ? <div className="mt-4 rounded-2xl border border-[#EDDBA3]/80 bg-white p-4"><p className="text-sm font-bold">{copy.benefit}</p><ul className="mt-2 space-y-2 text-sm">{order.entitlements.map((item) => <li key={item.label} className="flex justify-between gap-3"><span>{item.label}</span><strong>{item.quantity}</strong></li>)}</ul></div> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {order.receiptAvailable && order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-white">{copy.receipt}</a> : null}
              {order.status === "pending" || order.status === "unknown" ? <button type="button" onClick={onRetry} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-[#7A5230]">{copy.retry}</button> : null}
              <a href="mailto:admin@code-destiny.com" className="inline-flex min-h-11 items-center rounded-xl border border-[#EDDBA3] bg-white px-4 text-sm font-bold text-[#7A5230]">{copy.support}</a>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
