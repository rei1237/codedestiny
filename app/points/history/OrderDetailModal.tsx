"use client";

import { useEffect, useRef } from "react";
import type { LoadingLocale } from "@/constants/loadingMessages";
import type { OrderDetailViewModel } from "./order-view-model";
import styles from "./PointHistoryClient.module.css";

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
    failed: "주문 상세를 확인하지 못했습니다.",
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

function statusClass(status: OrderDetailViewModel["status"]) {
  if (status === "refunded") return `${styles.status} ${styles.statusRefunded}`;
  if (status === "cancelled") return `${styles.status} ${styles.statusCancelled}`;
  if (status === "pending" || status === "unknown") return `${styles.status} ${styles.statusPending}`;
  if (status === "failed") return `${styles.status} ${styles.statusFailed}`;
  return `${styles.status} ${styles.statusCompleted}`;
}

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
    <div className={styles.modalOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <p className="sr-only">Moonlight Order</p>
            <h2 id="order-detail-title" className={styles.modalTitle}>{order?.title || copy.detail}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className={styles.modalClose} aria-label={copy.close}>×</button>
        </div>

        {loading ? <p className={styles.modalLoading} aria-live="polite">{copy.loading}</p> : null}
        {error ? (
          <div className={styles.modalError} role="alert">
            <p>{error || copy.failed}</p>
            <button type="button" onClick={onRetry} className={styles.modalButton}>{copy.retry}</button>
          </div>
        ) : null}

        {order && !loading && !error ? (
          <>
            <div className={styles.modalStatus}>
              <span className={styles.modalStatusLabel}>{copy.detail}</span>
              <span className={statusClass(order.status)}>{order.statusLabel}</span>
            </div>
            <dl className={styles.detailList}>
              <div className={styles.detailRow}><dt>{copy.date}</dt><dd>{purchasedAt}</dd></div>
              {order.amount ? <div className={styles.detailRow}><dt>{copy.amount}</dt><dd>{order.amount.value.toLocaleString()} {order.amount.currency}</dd></div> : null}
              {order.paymentMethod ? <div className={styles.detailRow}><dt>{copy.method}</dt><dd>{order.paymentMethod}</dd></div> : null}
              <div className={styles.detailRow}><dt>{copy.order}</dt><dd className={styles.mono}>{order.orderNumberMasked}</dd></div>
              {order.approvalNumberMasked ? <div className={styles.detailRow}><dt>{copy.approval}</dt><dd className={styles.mono}>{order.approvalNumberMasked}</dd></div> : null}
            </dl>
            {order.entitlements.length ? (
              <div className={styles.entitlementBox}>
                <p className={styles.entitlementTitle}>{copy.benefit}</p>
                <ul className={styles.entitlementList}>
                  {order.entitlements.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.quantity}</strong></li>)}
                </ul>
              </div>
            ) : null}
            <div className={styles.modalActions}>
              {order.receiptAvailable && order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className={styles.receiptLink}>{copy.receipt}</a> : null}
              {order.status === "pending" || order.status === "unknown" ? <button type="button" onClick={onRetry} className={styles.modalButton}>{copy.retry}</button> : null}
              <a href="mailto:admin@code-destiny.com" className={styles.supportLink}>{copy.support}</a>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
