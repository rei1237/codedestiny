"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { authFetch, clearClientAuthState } from "../../_lib/auth-client";
import { getApiBaseUrl } from "../../_lib/api-config";
import { resolveMonthlyStoneBalance } from "../../_lib/monthly-stone";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { readServiceJson } from "../../_lib/service-read-client";
import { remoteQueryKeyToString, remoteQueryKeys } from "../../_lib/remote-query-keys";
import OrderDetailModal from "./OrderDetailModal";
import { adaptOrderToViewModel, type OrderDetailViewModel, type PaymentOrderRecord } from "./order-view-model";

/* ══════════════════════════════════════════════════════════════════
   타입 정의
══════════════════════════════════════════════════════════════════ */

type PaymentHistoryItem = {
  id: string;
  paymentAmount?: number;
  chargedPoints?: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  paymentType?: string;
  productId?: string;
  featureKey?: string;
  membershipCreditCost?: number;
  orderState?: string;
  subscriptionTier?: string;
  status: string;
  createdAt?: string | null;
  paidAt?: string | null;
  approvalNumber?: string | null;
};

type MonthlyCreditLedgerItem = {
  id: string;
  type: "MONTHLY_CREDIT_GRANT" | "MONTHLY_CREDIT_SPEND";
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  reason?: string;
  serviceKey?: string;
  createdAt?: string | null;
};

type MeResponse = {
  ok?: boolean;
  success?: boolean;
  data?: {
    balance?: number;
    monthlyStoneBalance?: number;
    monthlyCredits?: number;
    membershipCreditBalance?: number;
    payments?: PaymentHistoryItem[];
    monthlyCreditLedgers?: MonthlyCreditLedgerItem[];
    subscriptions?: SubscriptionStatusResponse[];
    degradedPayments?: boolean;
    degradedTransactions?: boolean;
    degradedMonthlyCredits?: boolean;
  };
  message?: string;
  user?: {
    id: string;
    name: string;
    monthlyStoneBalance?: number;
    monthlyCredits?: number;
  };
  payments?: PaymentHistoryItem[];  monthlyCreditLedgers?: MonthlyCreditLedgerItem[];
  subscriptions?: SubscriptionStatusResponse[];
};

type SubscriptionStatusResponse = {
  tier?: string;
  label?: string;
  isActive?: boolean;
  startedAt?: string | null;
  expiresAt?: string | null;
  source?: string;
  profileLimit?: number;
  freeLimit?: number;
  message?: string;
};

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type PointHistoryCopy = {
  defaultUserName: string;
  pointLoadFailed: string;
  paymentLoadFailed: string;
  subscriptionLoadFailed: string;
  pointServerError: string;
  paymentServerError: string;
  subscriptionChecking: string;
  loginRequired: string;
  subscriptionUnavailable: string;
  temporaryServerError: string;
  subscriptionDegraded: string;
  subscriptionFailed: string;
  tierFree: string;
  active: string;
  inactive: string;
  started: string;
  expires: string;
  daysLeft: (days: number) => string;
  subscriptionSummary: (input: { tier: string; active: string; started: string; expires: string; daysLeft?: string }) => string;
  monthlyCreditValue: (value: number, locale: string) => string;
  won: (value: number, locale: string) => string;
  paymentStatuses: Record<"refunded" | "cancelled" | "success", string>;
  loadingPage: string;
  headerEyebrow: string;
  title: string;
  subtitle: string;
  backToPoints: string;
  backToService: string;
  contentUnitAria: string;
  contentUnitLabel: string;
  benefitBalance: string;
  serverBalance: string;
  pointLookupFailed: (message: string) => string;
  retry: string;
  userSummary: (name: string) => string;
  ledgerNote: string;
  currentMembership: string;
  retrySubscription: string;
  summaryAria: string;
  currentBenefit: string;
  spentBenefit: string;
  remainingIcon: string;
  usedIcon: string;
  recentLimit: string;
  flowAria: string;
  flowTitle: string;
  tabs: Record<TabId, string>;
  loadingList: string;
  emptyLedger: string;
  spendLabel: string;
  grantLabel: string;
  spendIcon: string;
  grantIcon: string;
  afterBalance: string;
  paymentsAria: string;
  paymentsTitle: string;
  retryPayments: string;
  emptyPayments: string;
  paymentAmount: (value: string) => string;
  paidAt: (value: string) => string;
  paymentMethod: (value: string) => string;
  approvalNumber: (value: string) => string;
  guideTitle: string;
  guideItems: string[];
};

const POINT_HISTORY_COPY: Record<LoadingLocale, PointHistoryCopy> = {
  ko: {
    defaultUserName: "사용자",
    pointLoadFailed: "이용권 혜택 내역을 불러오지 못했습니다.",
    paymentLoadFailed: "결제 내역을 불러오지 못했습니다.",
    subscriptionLoadFailed: "구독 상태를 불러오지 못했습니다.",
    pointServerError: "이용권 혜택 서버 응답 오류입니다.",
    paymentServerError: "결제 서버 응답 오류입니다.",
    subscriptionChecking: "구독 상태 확인 중",
    loginRequired: "로그인 필요",
    subscriptionUnavailable: "구독 상태 조회 불가 (서버 일시 오류)",
    temporaryServerError: "잠시 후 다시 시도해 주세요.",
    subscriptionDegraded: "구독 정보 임시 조회 중 (서버 일시 불안정)",
    subscriptionFailed: "구독 상태 조회 실패",
    tierFree: "무료",
    active: "활성",
    inactive: "비활성",
    started: "시작",
    expires: "만료",
    daysLeft: (days) => `${days}일 남음`,
    subscriptionSummary: ({ tier, active, started, expires, daysLeft }) => `${tier} · ${active} · 시작 ${started} · 만료 ${expires}${daysLeft ? ` · ${daysLeft}` : ""}`,
    monthlyCreditValue: (value, locale) => `${value.toLocaleString(locale)}원 상당`,
    won: (value, locale) => `${value.toLocaleString(locale)}원`,
    paymentStatuses: {
      refunded: "환불완료",
      cancelled: "결제취소",
      success: "결제완료",
    },
    loadingPage: "이용권 혜택 내역을 불러오는 중...",
    headerEyebrow: "Payment Management",
    title: "결제/멤버십 관리",
    subtitle: "결제 내역과 멤버십 상태를 확인하세요.",
    backToPoints: "← 달빛 이용권 관리",
    backToService: "서비스 화면으로",
    contentUnitAria: "콘텐츠 가치 단위 안내",
    contentUnitLabel: "콘텐츠 가치 단위",
    benefitBalance: "이용권 혜택",
    serverBalance: "서버 기준 잔액",
    pointLookupFailed: (message) => `이용권 정보 조회 실패: ${message}`,
    retry: "다시 조회",
    userSummary: (name) => `${name} 님의 결제 내역과 이용권 혜택을 확인하세요.`,
    ledgerNote: "이용권 혜택 잔액과 이용 내역은 서버 원장 기준으로 표시됩니다.",
    currentMembership: "현재 멤버십",
    retrySubscription: "구독 상태 다시 조회",
    summaryAria: "이용권 혜택 요약",
    currentBenefit: "현재 이용권 혜택",
    spentBenefit: "총 사용 이용권 혜택",
    remainingIcon: "잔여",
    usedIcon: "사용",
    recentLimit: "최근 20건 기준",
    flowAria: "이용권 혜택 흐름 내역",
    flowTitle: "이용권 혜택 흐름 내역",
    tabs: { all: "전체", grant: "지급", spend: "사용" },
    loadingList: "내역을 불러오는 중...",
    emptyLedger: "아직 이용권 혜택 내역이 없습니다.",
    spendLabel: "이용권 혜택 사용",
    grantLabel: "이용권 혜택 지급",
    spendIcon: "사용",
    grantIcon: "지급",
    afterBalance: "반영 후 이용권 혜택",
    paymentsAria: "결제 내역",
    paymentsTitle: "결제 내역",
    retryPayments: "결제 내역 다시 조회",
    emptyPayments: "완료된 결제 내역이 없습니다.",
    paymentAmount: (value) => `결제 금액 ${value}`,
    paidAt: (value) => `결제시각: ${value}`,
    paymentMethod: (value) => `결제수단: ${value}`,
    approvalNumber: (value) => `승인번호: ${value}`,
    guideTitle: "결제/멤버십 이용 안내",
    guideItems: [
      "이용권 혜택 잔액과 사용 내역은 서버 원장 기준으로 표시됩니다.",
      "유료 상품은 원화 단건 결제로 결제되며, 결제 완료 후 해당 상품 이용 또는 결과 생성이 진행됩니다.",
      "시스템 오류, 중복 결제, 결과 미제공 건은 재생성 또는 환불 처리됩니다.",
      "환불 처리는 결제 수단(카드)으로만 가능합니다.",
      "콘텐츠 생성이 시작되기 전에는 취소/환불 요청이 가능합니다.",
      "콘텐츠 생성이 시작되었거나 결과가 정상 제공된 경우 디지털 콘텐츠 특성상 환불이 제한될 수 있습니다.",
      "달빛 이용권은 30일 상품이며 자동결제 상품이 아니고, 만료 후 다시 구매해야 합니다.",
      "이용권 결제 후 유료 기능을 이용하지 않은 경우 결제일로부터 7일 이내 환불 요청이 가능하며, 이용이 시작된 뒤에는 환불이 제한될 수 있습니다.",
      "이용권 혜택 흐름과 결제 내역은 최근 20건까지 표시됩니다. 더 오래된 내역이 필요하면 고객센터로 문의해 주세요.",
      "민원담당자: 박병하 (050-6664-7398) · admin@code-destiny.com",
    ],
  },
  en: {
    defaultUserName: "User",
    pointLoadFailed: "Unable to load pass benefit history.",
    paymentLoadFailed: "Unable to load payment history.",
    subscriptionLoadFailed: "Unable to load subscription status.",
    pointServerError: "The pass benefit server returned an invalid response.",
    paymentServerError: "The payment server returned an invalid response.",
    subscriptionChecking: "Checking subscription status",
    loginRequired: "Login required",
    subscriptionUnavailable: "Subscription status unavailable due to a temporary server issue",
    temporaryServerError: "Please try again shortly.",
    subscriptionDegraded: "Subscription information is being checked temporarily while the server stabilizes",
    subscriptionFailed: "Subscription status check failed",
    tierFree: "Free",
    active: "Active",
    inactive: "Inactive",
    started: "Start",
    expires: "Expires",
    daysLeft: (days) => `${days} days left`,
    subscriptionSummary: ({ tier, active, started, expires, daysLeft }) => `${tier} · ${active} · Start ${started} · Expires ${expires}${daysLeft ? ` · ${daysLeft}` : ""}`,
    monthlyCreditValue: (value, locale) => `Worth KRW ${value.toLocaleString(locale)}`,
    won: (value, locale) => `KRW ${value.toLocaleString(locale)}`,
    paymentStatuses: {
      refunded: "Refunded",
      cancelled: "Cancelled",
      success: "Paid",
    },
    loadingPage: "Loading pass benefit history...",
    headerEyebrow: "Payment Management",
    title: "Payments & Membership",
    subtitle: "Review your payment history and membership status.",
    backToPoints: "← Moonlight Pass",
    backToService: "Back to services",
    contentUnitAria: "Content value unit guide",
    contentUnitLabel: "Content Value Unit",
    benefitBalance: "Pass benefits",
    serverBalance: "Server balance",
    pointLookupFailed: (message) => `Pass information failed to load: ${message}`,
    retry: "Retry",
    userSummary: (name) => `Review ${name}'s payments and pass benefits.`,
    ledgerNote: "Pass benefit balances and usage history are shown from the server ledger.",
    currentMembership: "Current membership",
    retrySubscription: "Check subscription again",
    summaryAria: "Pass benefit summary",
    currentBenefit: "Current pass benefits",
    spentBenefit: "Total pass benefits used",
    remainingIcon: "Left",
    usedIcon: "Used",
    recentLimit: "Recent 20 records",
    flowAria: "Pass benefit activity history",
    flowTitle: "Pass Benefit Activity",
    tabs: { all: "All", grant: "Granted", spend: "Used" },
    loadingList: "Loading history...",
    emptyLedger: "No pass benefit history yet.",
    spendLabel: "Pass benefit used",
    grantLabel: "Pass benefit granted",
    spendIcon: "Used",
    grantIcon: "Grant",
    afterBalance: "Pass benefits after update",
    paymentsAria: "Payment history",
    paymentsTitle: "Payment History",
    retryPayments: "Reload payment history",
    emptyPayments: "No completed payments yet.",
    paymentAmount: (value) => `Payment amount ${value}`,
    paidAt: (value) => `Paid at: ${value}`,
    paymentMethod: (value) => `Payment method: ${value}`,
    approvalNumber: (value) => `Approval number: ${value}`,
    guideTitle: "Payment & Membership Guide",
    guideItems: [
      "Pass benefit balances and usage history are shown from the server ledger.",
      "Paid products are charged as one-time KRW payments, and access or result generation begins after payment is complete.",
      "System errors, duplicate payments, or missing results are handled through regeneration or refund.",
      "Refunds can only be returned to the original payment method.",
      "Cancellation or refund requests are available before content generation begins.",
      "Refunds may be limited once content generation has started or the result has been delivered normally.",
      "Moonlight Pass is a 30-day product, not an auto-renewing subscription, and must be purchased again after expiration.",
      "If no paid feature has been used after purchasing a pass, a refund request is available within 7 days of payment; refunds may be limited after usage begins.",
      "Pass benefit activity and payment history show up to the latest 20 records. Contact support if you need older records.",
      "Support contact: Byeongha Park (050-6664-7398) · admin@code-destiny.com",
    ],
  },
  ja: null as unknown as PointHistoryCopy,
  "zh-CN": null as unknown as PointHistoryCopy,
  "zh-TW": null as unknown as PointHistoryCopy,
  vi: null as unknown as PointHistoryCopy,
  hi: null as unknown as PointHistoryCopy,
  es: null as unknown as PointHistoryCopy,
  fr: null as unknown as PointHistoryCopy,
  de: null as unknown as PointHistoryCopy,
  nl: null as unknown as PointHistoryCopy,
  ms: null as unknown as PointHistoryCopy,
};

POINT_HISTORY_COPY.ja = {
  ...POINT_HISTORY_COPY.en,
  defaultUserName: "ユーザー",
  loadingPage: "利用券特典の履歴を読み込んでいます...",
  title: "決済・メンバーシップ管理",
  subtitle: "決済履歴とメンバーシップ状態を確認できます。",
  backToPoints: "← 月明かり利用券管理",
  backToService: "サービス画面へ",
  currentMembership: "現在のメンバーシップ",
  retrySubscription: "購読状態を再確認",
  currentBenefit: "現在の利用券特典",
  spentBenefit: "使用済み利用券特典",
  recentLimit: "直近20件基準",
  flowTitle: "利用券特典の履歴",
  tabs: { all: "すべて", grant: "付与", spend: "使用" },
  loadingList: "履歴を読み込んでいます...",
  emptyLedger: "まだ利用券特典の履歴はありません。",
  spendLabel: "利用券特典を使用",
  grantLabel: "利用券特典を付与",
  spendIcon: "使用",
  grantIcon: "付与",
  paymentsTitle: "決済履歴",
  emptyPayments: "完了した決済履歴はありません。",
  guideTitle: "決済・メンバーシップ利用案内",
};

POINT_HISTORY_COPY["zh-CN"] = {
  ...POINT_HISTORY_COPY.en,
  defaultUserName: "用户",
  loadingPage: "正在加载通行证权益记录...",
  title: "付款与会员管理",
  subtitle: "查看付款记录和会员状态。",
  backToPoints: "← 月光通行证管理",
  backToService: "返回服务页面",
  currentMembership: "当前会员",
  retrySubscription: "重新查询订阅状态",
  currentBenefit: "当前通行证权益",
  spentBenefit: "已使用通行证权益",
  recentLimit: "最近20条记录",
  flowTitle: "通行证权益流水",
  tabs: { all: "全部", grant: "发放", spend: "使用" },
  loadingList: "正在加载记录...",
  emptyLedger: "暂无通行证权益记录。",
  spendLabel: "使用通行证权益",
  grantLabel: "发放通行证权益",
  spendIcon: "使用",
  grantIcon: "发放",
  paymentsTitle: "付款记录",
  emptyPayments: "暂无已完成的付款记录。",
  guideTitle: "付款与会员使用说明",
};

POINT_HISTORY_COPY["zh-TW"] = {
  ...POINT_HISTORY_COPY["zh-CN"],
  defaultUserName: "使用者",
  loadingPage: "正在載入通行證權益紀錄...",
  title: "付款與會員管理",
  subtitle: "查看付款紀錄和會員狀態。",
  backToPoints: "← 月光通行證管理",
  backToService: "返回服務頁面",
  retrySubscription: "重新查詢訂閱狀態",
  currentBenefit: "目前通行證權益",
  spentBenefit: "已使用通行證權益",
  flowTitle: "通行證權益流水",
  emptyLedger: "尚無通行證權益紀錄。",
  paymentsTitle: "付款紀錄",
  emptyPayments: "尚無已完成的付款紀錄。",
};

for (const locale of ["vi", "hi", "es", "fr", "de", "nl", "ms"] as LoadingLocale[]) {
  POINT_HISTORY_COPY[locale] = POINT_HISTORY_COPY.en;
}

const FORMAT_LOCALE_BY_LANG: Record<LoadingLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  vi: "vi-VN",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  ms: "ms-MY",
};

/* ══════════════════════════════════════════════════════════════════
   유틸리티 함수
══════════════════════════════════════════════════════════════════ */

function formatDateTime(raw?: string | null, locale = "ko-KR") {
  if (!raw) return "-";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonthlyCredits(n: number, copy: PointHistoryCopy, locale: string) {
  const abs = Math.abs(n);
  return copy.monthlyCreditValue(abs * 10, locale);
}

function formatWon(n: number, copy: PointHistoryCopy, locale: string) {
  return copy.won(Number(n || 0), locale);
}

function orderStatusClass(status: OrderDetailViewModel["status"]) {
  if (status === "refunded") return "bg-sky-100 text-sky-800 border-sky-300";
  if (status === "cancelled") return "bg-slate-100 text-slate-700 border-slate-300";
  if (status === "pending" || status === "unknown") return "bg-amber-100 text-amber-800 border-amber-300";
  if (status === "failed") return "bg-rose-100 text-rose-800 border-rose-300";
  return "bg-emerald-100 text-emerald-800 border-emerald-300";
}

function normalizePointPayload(payload: MeResponse, copy: PointHistoryCopy) {
  const dataNode = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const monthlyStoneBalance = resolveMonthlyStoneBalance(dataNode, payload?.user) ?? 0;
  const monthlyCreditLedgers = Array.isArray(dataNode.monthlyCreditLedgers)
    ? dataNode.monthlyCreditLedgers
    : (Array.isArray(payload?.monthlyCreditLedgers) ? payload.monthlyCreditLedgers : []);

  return {
    userName: payload?.user?.name || copy.defaultUserName,
    balance: monthlyStoneBalance,
    pointHistories: monthlyCreditLedgers,
    message: payload?.message || "",
  };
}

function normalizePaymentPayload(payload: MeResponse) {
  const dataNode = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const payments = Array.isArray(dataNode.payments)
    ? dataNode.payments
    : (Array.isArray(payload?.payments) ? payload.payments : []);
  const subscriptions = Array.isArray(dataNode.subscriptions)
    ? dataNode.subscriptions
    : (Array.isArray(payload?.subscriptions) ? payload.subscriptions : []);

  return {
    payments,
    subscriptions,
    message: payload?.message || "",
  };
}

function buildSubscriptionSummaryText(data: SubscriptionStatusResponse | null | undefined, copy: PointHistoryCopy, locale: string) {
  const tier = String(data?.tier || "free").toLowerCase();
  const isActive = !!data?.isActive;
  const startedAt = data?.startedAt ? formatDateTime(data.startedAt, locale) : "-";
  const expiresAt = data?.expiresAt ? formatDateTime(data.expiresAt, locale) : "-";
  const expiresDate = data?.expiresAt ? new Date(data.expiresAt) : null;
  const daysLeft = expiresDate && Number.isFinite(expiresDate.getTime())
    ? Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / 86_400_000))
    : null;
  const tierLabel = tier === "free" ? copy.tierFree : (data?.label || tier.toUpperCase());
  const activeLabel = isActive ? copy.active : copy.inactive;
  return copy.subscriptionSummary({
    tier: tierLabel,
    active: activeLabel,
    started: startedAt,
    expires: expiresAt,
    daysLeft: daysLeft !== null ? copy.daysLeft(daysLeft) : undefined,
  });
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: CoinIcon
══════════════════════════════════════════════════════════════════ */

function CoinIcon({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeMap: Record<string, string> = {
    sm: "h-4 w-4 text-[8px]",
    md: "h-5 w-5 text-[10px]",
    lg: "h-6 w-6 text-[13px]",
  };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-black text-white select-none ${sizeMap[size]} ${className}`}
      style={{
        background: "radial-gradient(circle at 38% 32%, #fff6b0 0%, #f5c842 45%, #c8860a 100%)",
        boxShadow: "inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -1px 2px rgba(0,0,0,0.18), 0 2px 6px rgba(140,80,0,0.28)",
      }}
    >
      ✦
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════════════════════════════ */

type TabId = "all" | "grant" | "spend";

export default function PointHistoryPage() {
  const router = useRouter();
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = POINT_HISTORY_COPY[lang] || POINT_HISTORY_COPY.ko;
  const formatLocale = FORMAT_LOCALE_BY_LANG[lang] || FORMAT_LOCALE_BY_LANG.ko;
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionSummary, setSubscriptionSummary] = useState(() => copy.subscriptionChecking);

  const [userName, setUserName] = useState(() => copy.defaultUserName);
  const [currentMonthlyStoneBalance, setCurrentMonthlyStoneBalance] = useState(0);
  const [pointSnapshotReady, setPointSnapshotReady] = useState(false);
  const [histories, setHistories] = useState<MonthlyCreditLedgerItem[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailViewModel | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const paymentsMeInFlightRef = useRef<Promise<Response> | null>(null);
  const orderDetailAbortRef = useRef<AbortController | null>(null);
  const orderDetailCacheRef = useRef(new Map<string, OrderDetailViewModel>());

  const fetchPaymentsMe = useCallback(async () => {
    if (!paymentsMeInFlightRef.current) {
      const requestPromise = authFetch(`${apiBase}/api/payments/me?view=history`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
        clientSource: "app:points-history",
      });
      const trackedPromise = requestPromise.finally(() => {
        if (paymentsMeInFlightRef.current === trackedPromise) paymentsMeInFlightRef.current = null;
      });
      paymentsMeInFlightRef.current = trackedPromise;
    }
    const response = await paymentsMeInFlightRef.current;
    return response.clone();
  }, [apiBase]);

  const loadOrderDetail = useCallback(async (item: PaymentHistoryItem) => {
    const order = adaptOrderToViewModel(item as PaymentOrderRecord, lang);
    const cacheKey = remoteQueryKeyToString(remoteQueryKeys.orders.detail(order.id));
    setSelectedOrder(order);
    setOrderDetailError(null);
    const cached = orderDetailCacheRef.current.get(cacheKey);
    if (cached) {
      setSelectedOrder(cached);
      return;
    }

    orderDetailAbortRef.current?.abort();
    const controller = new AbortController();
    orderDetailAbortRef.current = controller;
    setOrderDetailLoading(true);
    try {
      const { data } = await readServiceJson<{ data?: { order?: PaymentOrderRecord } }>(
        `${apiBase}/api/payments/orders/${encodeURIComponent(order.id)}`,
        { credentials: "include", cache: "no-store" },
        { apiBase, clientSource: "app:points-history-order-detail", signal: controller.signal, maxRetries: 1 },
      );
      const detail = data?.data?.order;
      if (!detail) throw new Error("주문 상세 응답이 비어 있습니다.");
      const viewModel = adaptOrderToViewModel(detail, lang);
      orderDetailCacheRef.current.set(cacheKey, viewModel);
      setSelectedOrder(viewModel);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setOrderDetailError(friendlyErrorMessage(error, "주문 상세를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."));
    } finally {
      if (orderDetailAbortRef.current === controller) {
        orderDetailAbortRef.current = null;
        setOrderDetailLoading(false);
      }
    }
  }, [apiBase, lang]);

  const closeOrderDetail = useCallback(() => {
    orderDetailAbortRef.current?.abort();
    orderDetailAbortRef.current = null;
    setSelectedOrder(null);
    setOrderDetailError(null);
    setOrderDetailLoading(false);
  }, []);

  useEffect(() => () => orderDetailAbortRef.current?.abort(), []);

  useEffect(() => {
    const refreshLocale = () => setLang(getCurrentLoadingLocale());
    refreshLocale();
    window.addEventListener("cd:locale-ready", refreshLocale as EventListener);
    window.addEventListener("storage", refreshLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", refreshLocale as EventListener);
      window.removeEventListener("storage", refreshLocale);
    };
  }, []);

  const fetchPointsSection = useCallback(async () => {
    try {
      const res = await fetchPaymentsMe();
      if (res.status === 401 || res.status === 403) {
        clearClientAuthState();
        router.replace("/login?next=%2Fpoints%2Fhistory");
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json") || ct.includes("/json");
      if (!isJson) {
        if (!res.ok) throw new Error(`${copy.temporaryServerError} (HTTP ${res.status})`);
        throw new Error(copy.pointServerError);
      }
      const data: MeResponse = await res.json();
      if (!res.ok) {
        const msg = (data as { message?: string }).message || "";
        throw new Error(msg || copy.pointLoadFailed);
      }
      const normalized = normalizePointPayload(data, copy);
      const degradedLedger = Boolean(data?.data?.degradedTransactions || data?.data?.degradedMonthlyCredits);
      setUserName(normalized.userName);
      if (!degradedLedger) {
        setCurrentMonthlyStoneBalance(normalized.balance);
        setHistories(Array.isArray(normalized.pointHistories) ? normalized.pointHistories.filter(Boolean) : []);
        setPointSnapshotReady(true);
      }
      setPointsError(degradedLedger ? copy.temporaryServerError : null);
    } catch (e: unknown) {
      setPointsError(friendlyErrorMessage(e, copy.pointLoadFailed));
    }
  }, [copy, fetchPaymentsMe, router]);

  const fetchPaymentsSection = useCallback(async () => {
    try {
      const res = await fetchPaymentsMe();
      if (res.status === 401 || res.status === 403) {
        clearClientAuthState();
        router.replace("/login?next=%2Fpoints%2Fhistory");
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json") || ct.includes("/json");
      if (!isJson) {
        if (!res.ok) throw new Error(`${copy.temporaryServerError} (HTTP ${res.status})`);
        throw new Error(copy.paymentServerError);
      }
      const data: MeResponse = await res.json();
      if (!res.ok) {
        const msg = (data as { message?: string }).message || "";
        throw new Error(msg || copy.paymentLoadFailed);
      }
      const normalized = normalizePaymentPayload(data);
      const degradedPayments = Boolean(data?.data?.degradedPayments);
      if (!degradedPayments) {
        setPayments(
          Array.isArray(normalized.payments)
            ? normalized.payments.filter((p) => Boolean(p?.id))
            : [],
        );
      }
      const activeSubscription = Array.isArray(normalized.subscriptions)
        ? normalized.subscriptions.find((sub) => sub?.isActive) || normalized.subscriptions[0]
        : null;
      if (activeSubscription) {
        setSubscriptionSummary(buildSubscriptionSummaryText(activeSubscription, copy, formatLocale));
        setSubscriptionError(null);
      }
      setPaymentsError(degradedPayments ? copy.temporaryServerError : null);
    } catch (e: unknown) {
      setPaymentsError(friendlyErrorMessage(e, copy.paymentLoadFailed));
    }
  }, [copy, fetchPaymentsMe, formatLocale, router]);

  const fetchSubscriptionSection = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/api/subscription/status`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
        clientSource: "app:points-history",
      });
      if (res.status === 401 || res.status === 403) {
        setSubscriptionSummary(copy.loginRequired);
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json") || ct.includes("/json");
      // JSON 응답이 아닌 경우: 상태 조회 실패로 처리하되 전체 페이지를 막지 않음
      if (!isJson) {
        setSubscriptionSummary(copy.subscriptionUnavailable);
        setSubscriptionError(copy.temporaryServerError);
        return;
      }
      const data: SubscriptionStatusResponse & { degraded?: boolean; source?: string } = await res.json();
      // degraded 응답(DB 연결 일시 장애)은 실패로 처리하지 않고 안내 표시
      if ((data as { degraded?: boolean }).degraded) {
        setSubscriptionSummary(copy.subscriptionDegraded);
        setSubscriptionError(null);
        return;
      }
      if (!res.ok) {
        const msg = data.message || copy.subscriptionLoadFailed;
        throw new Error(msg);
      }
      const tier = String(data?.tier || "free").toLowerCase();
      const isActive = !!data?.isActive;
      const nextSummary = buildSubscriptionSummaryText({ ...data, tier, isActive }, copy, formatLocale);
      setSubscriptionSummary((prev) => (!isActive && prev.includes(` · ${copy.active} · `) ? prev : nextSummary));
      setSubscriptionError(null);
    } catch (e: unknown) {
      setSubscriptionError(friendlyErrorMessage(e, copy.subscriptionLoadFailed));
      setSubscriptionSummary(copy.subscriptionFailed);
    }
  }, [apiBase, copy, formatLocale]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchPointsSection(),
      fetchPaymentsSection(),
    ]);
    setIsLoading(false);
  }, [fetchPaymentsSection, fetchPointsSection]);

  useEffect(() => {
    if (!router) return;
    setIsBooting(false);
  }, [router]);

  useEffect(() => {
    if (isBooting) return;
    fetchData();
  }, [isBooting, fetchData]);

  /* ── 탭 필터링 ─────────────────────────────────────────────── */
  const filteredHistories = useMemo(() => {
    if (activeTab === "all") return histories;
    if (activeTab === "grant") return histories.filter((h) => h.type === "MONTHLY_CREDIT_GRANT");
    return histories.filter((h) => h.type === "MONTHLY_CREDIT_SPEND");
  }, [histories, activeTab]);

  /* 요약 통계 */
  const totalSpentMonthlyCredits = useMemo(
    () => histories.reduce((sum, entry) => entry.type === "MONTHLY_CREDIT_SPEND" ? sum + Number(entry.amount || 0) : sum, 0),
    [histories],
  );

  /* ── 부팅 중 ─────────────────────────────────────────────────── */
  if (isBooting) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: "linear-gradient(160deg, #FDF8F0 0%, #FDF0D8 100%)" }}
      >
        <div className="text-center text-[#5C3A1E]">
          <div className="mb-3 text-5xl animate-bounce">🐷</div>
          <p className="font-semibold">{copy.loadingPage}</p>
        </div>
      </main>
    );
  }

  /* ── 메인 렌더 ─────────────────────────────────────────────────── */
  return (
    <main
      className="relative min-h-screen px-4 py-8"
      style={{ background: "linear-gradient(160deg, #FDFAF4 0%, #FDF3E0 35%, #FAE9CC 65%, #F7DEB8 100%)" }}
    >
      <div className="mx-auto w-full max-w-2xl space-y-5">

        {/* 헤더 */}
        <header className="rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(120,80,10,0.14)]">
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #A0680A 0%, #FFD060 25%, #FFFFFF 50%, #FFD060 75%, #A0680A 100%)" }}
            aria-hidden="true"
          />
          <div
            className="border border-t-0 border-[#EDDBA3] rounded-b-[24px] p-6"
            style={{ background: "linear-gradient(135deg, rgba(255,253,247,0.97) 0%, rgba(255,249,238,0.95) 100%)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.22em] text-amber-800 uppercase">{copy.headerEyebrow}</p>
                <h1 className="mt-0.5 text-[22px] font-black text-[#5C3A1E] leading-tight">
                  🐷 {copy.title}
                </h1>
                <p className="mt-1 text-sm text-[#7A5230]">{copy.subtitle}</p>
              </div>
              <div className="flex flex-col gap-2 self-start sm:items-end">
                <Link
                  href="/points"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5"
                >
                  {copy.backToPoints}
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5"
                >
                  {copy.backToService}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 가치 단위 안내 */}
        <section
          aria-label={copy.contentUnitAria}
          className="rounded-[24px] overflow-hidden shadow-[0_10px_36px_rgba(180,130,30,0.22)]"
        >
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #C8860A 0%, #FFE070 30%, #FFFFFF 50%, #FFE070 70%, #C8860A 100%)" }}
            aria-hidden="true"
          />
          <div
            className="border border-t-0 border-amber-200 rounded-b-[24px] p-5"
            style={{ background: "linear-gradient(135deg, #FFFAE8 0%, #FFF3CC 50%, #FFE89C 100%)" }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800 mb-1">{copy.contentUnitLabel}</p>
            <div className="flex items-center gap-3">
              <CoinIcon size="lg" />
              <span className="text-[28px] font-black text-[#7A4A00] leading-none">
                {copy.benefitBalance}
                <span className="ml-1.5 text-base font-bold text-amber-800">{copy.serverBalance}</span>
              </span>
            </div>
            {pointsError ? (
              <div className="mt-2 rounded-[10px] border border-rose-200 bg-rose-50 px-2.5 py-2">
                <p className="text-[11px] font-bold text-rose-700">{copy.pointLookupFailed(pointsError)}</p>
                <button
                  type="button"
                  onClick={() => { fetchPointsSection(); }}
                  className="mt-1 text-[11px] font-bold text-rose-600 underline"
                >
                  {copy.retry}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-amber-800 font-semibold">
                {copy.userSummary(userName)}
              </p>
            )}
            <p className="mt-1 text-[11px] text-[#9B7040]">
              {copy.ledgerNote}
            </p>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800">{copy.currentMembership}</p>
          <p className="mt-1 text-sm font-semibold text-[#7A5230]">{subscriptionSummary}</p>
          {subscriptionError && (
            <button
              type="button"
              onClick={() => { fetchSubscriptionSection(); }}
              className="mt-1 text-[12px] font-bold text-rose-600 underline"
            >
              {copy.retrySubscription}
            </button>
          )}
        </section>

        {/* 요약 통계 */}
        <section
          aria-label={copy.summaryAria}
          className="grid grid-cols-2 gap-3"
        >
            {[
              { label: copy.currentBenefit, value: currentMonthlyStoneBalance, icon: copy.remainingIcon, showCoin: false, cls: "border-amber-200 bg-amber-50/80", valcls: "text-amber-700" },
              { label: copy.spentBenefit, value: totalSpentMonthlyCredits, icon: copy.usedIcon, showCoin: false, cls: "border-rose-200 bg-rose-50/80", valcls: "text-rose-700" },
            ].map((item) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${item.cls}`}
            >
              <p className="text-[11px] font-bold text-neutral-500 mb-1">{item.icon} {item.label}</p>
              <div className="flex items-center gap-1.5">
                {item.showCoin && <CoinIcon size="sm" />}
                <span className={`text-[18px] font-black leading-none ${item.valcls}`}>
                  {pointSnapshotReady ? formatMonthlyCredits(item.value, copy, formatLocale) : "—"}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">{copy.recentLimit}</p>
            </div>
          ))}
        </section>

        {/* 이용권 혜택 흐름 내역 */}
        <section
          aria-label={copy.flowAria}
          className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] overflow-hidden shadow-[0_8px_28px_rgba(120,80,10,0.09)]"
        >
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-bold text-[#5C3A1E] mb-3">{copy.flowTitle}</h2>

            {/* 탭 */}
            <div className="flex gap-2 mb-4">
              {([
                { id: "all", label: copy.tabs.all },
                { id: "grant", label: copy.tabs.grant },
                { id: "spend", label: copy.tabs.spend },
              ] as Array<{ id: TabId; label: string }>).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition",
                    activeTab === tab.id
                      ? "bg-amber-500 text-white shadow-[0_4px_12px_rgba(180,130,0,0.35)]"
                      : "bg-white border border-[#EDDBA3] text-[#7A5230] hover:bg-amber-50",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-3xl animate-bounce">🐷</div>
                <p className="ml-3 text-sm text-[#7A5230]">{copy.loadingList}</p>
              </div>
            ) : pointsError ? (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-700">⚠️ {pointsError}</p>
                <button
                  type="button"
                  onClick={() => { fetchPointsSection(); }}
                  className="mt-2 text-[12px] font-bold text-rose-600 underline"
                >
                  {copy.retry}
                </button>
              </div>
            ) : filteredHistories.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-[#7A5230]">{copy.emptyLedger}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHistories.map((entry) => {
                  const isSpend = entry.type === "MONTHLY_CREDIT_SPEND";
                  const kl = isSpend
                    ? { text: copy.spendLabel, cls: "bg-rose-100 text-rose-700 border-rose-300" }
                    : { text: copy.grantLabel, cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
                  const dc = isSpend ? "text-rose-700" : "text-emerald-700";
                  const prefix = isSpend ? "-" : "+";
                  const displayReason = entry.reason || entry.serviceKey || "-";
                  return (
                    <div
                      key={entry.id}
                      className="rounded-[16px] border border-[#EFDCA8] bg-white/95 p-3.5 flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 text-xl mt-0.5 leading-none">{isSpend ? copy.spendIcon : copy.grantIcon}</span>
                      <div className="flex-1 min-w-0">
                        {/* 날짜 */}
                        <p className="text-[11px] text-[#9B7040] mb-1 font-medium">
                          {formatDateTime(entry.createdAt, formatLocale)}
                        </p>
                        {/* 상품명 + 금액 */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${kl.cls}`}>
                              {kl.text}
                            </span>
                            <span className="text-[12px] font-semibold text-[#5C3A1E] line-clamp-1">
                              {displayReason}
                            </span>
                          </div>
                          <span className={`text-[15px] font-black flex-shrink-0 ${dc}`}>
                            {prefix}{formatMonthlyCredits(entry.amount, copy, formatLocale)}
                          </span>
                        </div>
                        {/* 잔여 이용권 혜택 */}
                        <div className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                          <CoinIcon size="sm" />
                          <p className="text-[12px] text-[#7A4A00] font-bold">
                            {copy.afterBalance}&nbsp;
                            <span className="text-[13px] text-[#5C3A1E]">
                              {formatMonthlyCredits(entry.afterBalance, copy, formatLocale)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 결제 내역 (결제 성공 건) */}
        <section
          aria-label={copy.paymentsAria}
          className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] p-5 shadow-[0_8px_28px_rgba(120,80,10,0.09)]"
        >
          <h2 className="text-[15px] font-bold text-[#5C3A1E] mb-3">{copy.paymentsTitle}</h2>
          {paymentsError ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-sm font-semibold text-rose-700">⚠️ {paymentsError}</p>
              <button
                type="button"
                onClick={() => { fetchPaymentsSection(); }}
                className="mt-2 text-[12px] font-bold text-rose-600 underline"
              >
                {copy.retryPayments}
              </button>
            </div>
          ) : payments.length === 0 && !isLoading ? (
            <p className="text-sm text-[#7A5230]">{copy.emptyPayments}</p>
          ) : (
            <div className="space-y-2.5">
              {payments.map((p) => {
                const order = adaptOrderToViewModel(p as PaymentOrderRecord, lang);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { void loadOrderDetail(p); }}
                    className="block w-full rounded-[16px] border border-[#EFDCA8] bg-white/95 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_6px_18px_rgba(120,80,10,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                    aria-label={`${order.title} ${order.statusLabel}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#5C3A1E]">
                        {order.amount ? copy.paymentAmount(formatWon(order.amount.value, copy, formatLocale)) : order.title}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${orderStatusClass(order.status)}`}>
                        {order.statusLabel}
                      </span>
                    </div>
                    <div className="mt-1.5 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-2">
                      <p>{copy.paidAt(formatDateTime(order.purchasedAt, formatLocale))}</p>
                      <p>{copy.paymentMethod(order.paymentMethod || "-")}</p>
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-amber-700">{lang === "ko" ? "상세 확인 ›" : "View details ›"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedOrder ? (
          <OrderDetailModal
            locale={lang}
            order={selectedOrder}
            loading={orderDetailLoading}
            error={orderDetailError}
            onRetry={() => { const current = payments.find((item) => item.id === selectedOrder.id); if (current) void loadOrderDetail(current); }}
            onClose={closeOrderDetail}
          />
        ) : null}

        {/* 안내 */}
        <section className="rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E] mb-2">{copy.guideTitle}</h3>
          <ul className="space-y-1.5 text-sm text-[#7A5230]">
            {copy.guideItems.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>

      </div>
    </main>
  );
}
