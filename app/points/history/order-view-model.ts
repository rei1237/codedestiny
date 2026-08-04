import type { LoadingLocale } from "@/constants/loadingMessages";

export type OrderStatus = "pending" | "completed" | "cancelled" | "failed" | "refunded" | "partially_refunded" | "unknown" | "legacy";
export type OrderType = "moonstone" | "pass" | "guardian-fortune" | "fusion-fortune" | "single-feature" | "unknown";

export type PaymentOrderRecord = {
  id: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  paymentType?: string;
  productId?: string;
  featureKey?: string;
  subscriptionTier?: string;
  membershipCreditCost?: number;
  chargedPoints?: number;
  status?: string;
  orderState?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  paidAt?: string | null;
  orderNumberMasked?: string | null;
  approvalNumberMasked?: string | null;
  receiptUrl?: string | null;
  receiptAvailable?: boolean;
};

export type OrderAction = "view" | "receipt" | "retry-status";

export type OrderDetailViewModel = {
  id: string;
  type: OrderType;
  title: string;
  description?: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod?: string;
  amount?: { value: number; currency: string };
  quantity?: number;
  purchasedAt: string;
  completedAt?: string;
  orderNumberMasked: string;
  approvalNumberMasked?: string;
  receiptAvailable: boolean;
  receiptUrl?: string;
  entitlements: Array<{ label: string; quantity: number }>;
  actions: OrderAction[];
};

const COPY = {
  ko: {
    moonstone: "월정석",
    pass: "달빛 이용권",
    guardian: "오늘의 귀인 운세 대화권",
    fusion: "초융합 운세 상담권",
    feature: "개별 운세 이용권",
    unknown: "결제 내역",
    pending: "처리 중",
    completed: "결제 완료",
    cancelled: "결제 취소",
    failed: "결제 실패",
    refunded: "환불 완료",
    partiallyRefunded: "부분 환불",
    unknownStatus: "상태 확인 필요",
    legacy: "이전 주문 형식",
    entitlement: "이용권 혜택",
  },
  en: {
    moonstone: "Moonlight credit",
    pass: "Moonlight Pass",
    guardian: "Guardian Fortune conversation pass",
    fusion: "Fusion Fortune consultation pass",
    feature: "Feature pass",
    unknown: "Payment order",
    pending: "Processing",
    completed: "Paid",
    cancelled: "Cancelled",
    failed: "Failed",
    refunded: "Refunded",
    partiallyRefunded: "Partially refunded",
    unknownStatus: "Status check needed",
    legacy: "Legacy order format",
    entitlement: "Pass benefit",
  },
} as const;

type Copy = { [Key in keyof (typeof COPY)["ko"]]: string };

function copyFor(locale: LoadingLocale): Copy {
  return locale === "ko" ? COPY.ko : COPY.en;
}

function resolveType(order: PaymentOrderRecord): OrderType {
  const product = `${order.productId || ""} ${order.featureKey || ""}`.toLowerCase();
  const paymentType = String(order.paymentType || "").toLowerCase();
  if (product.includes("guardian")) return "guardian-fortune";
  if (product.includes("fusion")) return "fusion-fortune";
  if (paymentType.includes("membership") || product.includes("pass") || order.subscriptionTier) return "pass";
  if (paymentType.includes("point") || product.includes("moonstone") || product.includes("monthly")) return "moonstone";
  if (order.featureKey || order.productId) return "single-feature";
  return "unknown";
}

function resolveStatus(rawStatus: unknown, orderState: unknown): OrderStatus {
  const value = `${String(rawStatus || "")} ${String(orderState || "")}`.toLowerCase();
  if (value.includes("partial")) return "partially_refunded";
  if (value.includes("refund")) return "refunded";
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("fail") || value.includes("error")) return "failed";
  if (value.includes("pending") || value.includes("processing") || value.includes("redirect")) return "pending";
  if (value.includes("success") || value.includes("paid") || value.includes("complete") || value.includes("fulfilled")) return "completed";
  return orderState || rawStatus ? "unknown" : "legacy";
}

function statusLabel(status: OrderStatus, copy: Copy): string {
  return {
    pending: copy.pending,
    completed: copy.completed,
    cancelled: copy.cancelled,
    failed: copy.failed,
    refunded: copy.refunded,
    partially_refunded: copy.partiallyRefunded,
    unknown: copy.unknownStatus,
    legacy: copy.legacy,
  }[status];
}

function titleFor(type: OrderType, copy: Copy): string {
  return {
    moonstone: copy.moonstone,
    pass: copy.pass,
    "guardian-fortune": copy.guardian,
    "fusion-fortune": copy.fusion,
    "single-feature": copy.feature,
    unknown: copy.unknown,
  }[type];
}

export function adaptOrderToViewModel(order: PaymentOrderRecord, locale: LoadingLocale = "ko"): OrderDetailViewModel {
  const copy = copyFor(locale);
  const type = resolveType(order);
  const status = resolveStatus(order.status, order.orderState);
  const amountValue = Math.max(0, Math.floor(Number(order.paymentAmount || 0)));
  const quantity = Math.max(0, Math.floor(Number(order.membershipCreditCost || order.chargedPoints || 0)));
  const purchasedAt = String(order.paidAt || order.createdAt || order.updatedAt || "").trim() || "-";
  const receiptAvailable = order.receiptAvailable === true || Boolean(order.receiptUrl);

  return {
    id: String(order.id || "").trim(),
    type,
    title: titleFor(type, copy),
    description: order.productId || order.featureKey || undefined,
    status,
    statusLabel: statusLabel(status, copy),
    paymentMethod: order.paymentMethodLabel || order.paymentMethod || undefined,
    amount: amountValue > 0 ? { value: amountValue, currency: "KRW" } : undefined,
    quantity: quantity > 0 ? quantity : undefined,
    purchasedAt,
    completedAt: order.paidAt || undefined,
    orderNumberMasked: String(order.orderNumberMasked || "-") || "-",
    approvalNumberMasked: order.approvalNumberMasked || undefined,
    receiptAvailable,
    receiptUrl: order.receiptUrl || undefined,
    entitlements: quantity > 0 ? [{ label: copy.entitlement, quantity }] : [],
    actions: ["view", ...(receiptAvailable ? ["receipt" as const] : []), ...(status === "pending" || status === "unknown" ? ["retry-status" as const] : [])],
  };
}
