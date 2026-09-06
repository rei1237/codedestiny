"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { authFetch, clearClientAuthState } from "../../_lib/auth-client";
import { useUserAccess } from "../../_lib/user-session-cache";
import { getApiBaseUrl } from "../../_lib/api-config";
import { normalizeMonthlyStoneBalance, resolveMonthlyStoneBalance } from "../../_lib/monthly-stone";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { readServiceJson } from "../../_lib/service-read-client";
import { remoteQueryKeyToString, remoteQueryKeys } from "../../_lib/remote-query-keys";
import OrderDetailModal from "./OrderDetailModal";
import { adaptOrderToViewModel, type OrderDetailViewModel, type PaymentOrderRecord } from "./order-view-model";
import PassCycleCard from "../../components/PassCycleCard";
import styles from "./PointHistoryClient.module.css";

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
    passCycleTier?: string | null;
    passCycleCapWon?: number | null;
    passCycleSpentWon?: number | null;
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
  passCycleAria: string;
  passCycleTitle: string;
  passCycleTierLabel: Record<"standard" | "premium" | "vvip" | "family", string>;
  passCycleSummary: (spent: string, cap: string) => string;
  passCycleRemaining: (remaining: string) => string;
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
    headerEyebrow: "Moonlight Pass",
    title: "결제·이용권 기록",
    subtitle: "달빛 이용권과 결제 상태를 한 곳에서 확인하세요.",
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
    grantLabel: "월정석 지급",
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
    passCycleAria: "이번 이용권 기간의 월 이용 한도",
    passCycleTitle: "이번 이용권 기간 한도",
    passCycleTierLabel: {
      standard: "스탠다드 꿀",
      premium: "프리미엄 꿀",
      vvip: "VVIP 꿀단지",
      family: "Code Destiny Family",
    },
    passCycleSummary: (spent, cap) => `${spent} / ${cap} 사용`,
    passCycleRemaining: (remaining) => `${remaining} 남음`,
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
    headerEyebrow: "Moonlight Pass",
    title: "Payments & Passes",
    subtitle: "Review your Moonlight Pass and payment status in one place.",
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
    grantLabel: "Moonstone granted",
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
    passCycleAria: "Monthly usage limit for this pass period",
    passCycleTitle: "Current pass period limit",
    passCycleTierLabel: {
      standard: "Standard Honey",
      premium: "Premium Honey",
      vvip: "VVIP Honey Jar",
      family: "Code Destiny Family",
    },
    passCycleSummary: (spent, cap) => `${spent} of ${cap} used`,
    passCycleRemaining: (remaining) => `${remaining} left`,
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
  grantLabel: "月精石を付与",
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
  grantLabel: "发放月精石",
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
  if (status === "refunded") return `${styles.status} ${styles.statusRefunded}`;
  if (status === "cancelled") return `${styles.status} ${styles.statusCancelled}`;
  if (status === "pending" || status === "unknown") return `${styles.status} ${styles.statusPending}`;
  if (status === "failed") return `${styles.status} ${styles.statusFailed}`;
  return `${styles.status} ${styles.statusCompleted}`;
}

function normalizePointPayload(payload: MeResponse, copy: PointHistoryCopy) {
  const dataNode = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const monthlyStoneBalance = resolveMonthlyStoneBalance(dataNode, payload?.user) ?? 0;
  const monthlyCreditLedgers = Array.isArray(dataNode.monthlyCreditLedgers)
    ? dataNode.monthlyCreditLedgers
    : (Array.isArray(payload?.monthlyCreditLedgers) ? payload.monthlyCreditLedgers : []);
  // 이용권 월 이용 한도. normalizeMonthlyStoneBalance 와 같은 정규화 규칙(0 이상 정수 또는 null)을
  // 재사용한다 — 서버가 안 내려주면(이용권 없음 등) null 로 남아 카드 자체를 숨긴다.
  const passCycleTier = typeof dataNode.passCycleTier === "string" ? dataNode.passCycleTier : null;
  const passCycleCapWon = normalizeMonthlyStoneBalance(dataNode.passCycleCapWon);
  const passCycleSpentWon = normalizeMonthlyStoneBalance(dataNode.passCycleSpentWon);

  return {
    userName: payload?.user?.name || copy.defaultUserName,
    balance: monthlyStoneBalance,
    pointHistories: monthlyCreditLedgers,
    message: payload?.message || "",
    passCycleTier,
    passCycleCapWon,
    passCycleSpentWon,
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
  const userAccess = useUserAccess();
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
  const [passCycleTier, setPassCycleTier] = useState<string | null>(null);
  const [passCycleCapWon, setPassCycleCapWon] = useState<number | null>(null);
  const [passCycleSpentWon, setPassCycleSpentWon] = useState<number | null>(null);
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
        setPassCycleTier(normalized.passCycleTier);
        setPassCycleCapWon(normalized.passCycleCapWon);
        setPassCycleSpentWon(normalized.passCycleSpentWon);
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

  const snapshotPassUsage = userAccess.accessState?.entitlementSnapshot?.passUsage as {
    tier?: string | null;
    limitKRW?: number | null;
    usedKRW?: number | null;
    remainingKRW?: number | null;
  } | undefined;
  const displayedPassCycleTier = snapshotPassUsage?.tier || passCycleTier;
  const displayedPassCycleCapWon = snapshotPassUsage?.limitKRW ?? passCycleCapWon;
  const displayedPassCycleSpentWon = snapshotPassUsage?.usedKRW ?? passCycleSpentWon;
  const displayedPassCycleRemainingWon = snapshotPassUsage?.remainingKRW
    ?? (displayedPassCycleCapWon === null || displayedPassCycleSpentWon === null
      ? null
      : Math.max(0, displayedPassCycleCapWon - displayedPassCycleSpentWon));

  /* 이용권 월 이용 한도 잔여/진행률. 스냅샷이 있으면 /points와 같은 원천을 사용한다. */
  const passCyclePercent = useMemo(() => (
    !displayedPassCycleCapWon ? 0 : Math.min(100, Math.round(((displayedPassCycleSpentWon ?? 0) / displayedPassCycleCapWon) * 100))
  ), [displayedPassCycleCapWon, displayedPassCycleSpentWon]);

  /* ── 부팅 중 ─────────────────────────────────────────────────── */
  if (isBooting) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingContent}>
          <div className="text-4xl" aria-hidden="true">✦</div>
          <p>{copy.loadingPage}</p>
        </div>
      </main>
    );
  }

  /* ── 메인 렌더 ─────────────────────────────────────────────────── */
  return (
    <main className={styles.page}>
      <div className={styles.container}>

        <section className={styles.hero} aria-labelledby="point-history-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.headerEyebrow}</p>
            <h1 id="point-history-title" className={styles.title}>✦ {copy.title}</h1>
            <p className={styles.subtitle}>{copy.subtitle}</p>
          </div>
          <nav className={styles.nav} aria-label={copy.backToPoints}>
            <Link href="/points" className={styles.navLink}>{copy.backToPoints}</Link>
            <Link href="/" prefetch={false} className={styles.navLink}>{copy.backToService}</Link>
          </nav>
        </section>

        {/* 콘텐츠 가치 단위 안내 */}
        <section aria-label={copy.contentUnitAria} className={styles.highlight}>
          <div className={styles.highlightBody}>
            <p className={styles.sectionLabel}>{copy.contentUnitLabel}</p>
            <div className={styles.balanceRow}>
              <CoinIcon size="lg" />
              <span className={styles.balanceValue}>
                {copy.benefitBalance}
                <span className={styles.balanceHint}>{copy.serverBalance}</span>
              </span>
            </div>
            {pointsError ? (
              <div className={styles.error}>
                <p>{copy.pointLookupFailed(pointsError)}</p>
                <button
                  type="button"
                  onClick={() => { fetchPointsSection(); }}
                  className={styles.errorAction}
                >
                  {copy.retry}
                </button>
              </div>
            ) : (
              <p className={styles.bodyText}>
                {copy.userSummary(userName)}
              </p>
            )}
            <p className={styles.bodyText}>
              {copy.ledgerNote}
            </p>
          </div>
        </section>

        <section className={styles.surface}>
          <p className={styles.sectionLabel}>{copy.currentMembership}</p>
          <p className={styles.membershipSummary}>{subscriptionSummary}</p>
          {subscriptionError && (
            <button
              type="button"
              onClick={() => { fetchSubscriptionSection(); }}
              className={styles.actionLink}
            >
              {copy.retrySubscription}
            </button>
          )}
        </section>

        {/* 이용권 월 이용 한도 — 이용권 보유 + 서버가 캡을 내려줄 때만 표시 */}
        {displayedPassCycleTier && displayedPassCycleCapWon !== null && displayedPassCycleSpentWon !== null && displayedPassCycleRemainingWon !== null && (
          <PassCycleCard
            tier={displayedPassCycleTier}
            capWon={displayedPassCycleCapWon}
            spentWon={displayedPassCycleSpentWon}
            remainingWon={displayedPassCycleRemainingWon}
            percent={passCyclePercent}
            copy={{
              ariaLabel: copy.passCycleAria,
              title: copy.passCycleTitle,
              tierLabel: copy.passCycleTierLabel[displayedPassCycleTier as "standard" | "premium" | "vvip" | "family"] || displayedPassCycleTier,
              summary: copy.passCycleSummary,
              remaining: copy.passCycleRemaining,
            }}
            formatWon={(value) => formatWon(value, copy, formatLocale)}
          />
        )}

        {/* 요약 통계 */}
        <section
          aria-label={copy.summaryAria}
          className={styles.stats}
        >
            {[
              { label: copy.currentBenefit, value: currentMonthlyStoneBalance, icon: copy.remainingIcon },
              { label: copy.spentBenefit, value: totalSpentMonthlyCredits, icon: copy.usedIcon },
            ].map((item) => (
            <div key={item.label} className={styles.stat}>
              <p className={styles.statLabel}>{item.icon} {item.label}</p>
              <div>
                <span className={styles.statValue}>
                  {pointSnapshotReady ? formatMonthlyCredits(item.value, copy, formatLocale) : "—"}
                </span>
              </div>
              <p className={styles.statMeta}>{copy.recentLimit}</p>
            </div>
          ))}
        </section>

        {/* 이용권 혜택 흐름 내역 */}
        <section
          aria-label={copy.flowAria}
          className={styles.surface}
        >
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{copy.flowTitle}</h2>
          </div>

            {/* 탭 */}
            <div className={styles.tabs}>
              {([
                { id: "all", label: copy.tabs.all },
                { id: "grant", label: copy.tabs.grant },
                { id: "spend", label: copy.tabs.spend },
              ] as Array<{ id: TabId; label: string }>).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                  aria-pressed={activeTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          <div>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className="text-2xl" aria-hidden="true">✦</div>
                <p>{copy.loadingList}</p>
              </div>
            ) : pointsError ? (
              <div className={styles.error} role="alert">
                <p>{pointsError}</p>
                <button
                  type="button"
                  onClick={() => { fetchPointsSection(); }}
                  className={styles.errorAction}
                >
                  {copy.retry}
                </button>
              </div>
            ) : filteredHistories.length === 0 ? (
              <div className={styles.emptyState}>
                <p className="text-2xl" aria-hidden="true">—</p>
                <p>{copy.emptyLedger}</p>
              </div>
            ) : (
              <div className={styles.list}>
                {filteredHistories.map((entry) => {
                  const isSpend = entry.type === "MONTHLY_CREDIT_SPEND";
                  const prefix = isSpend ? "-" : "+";
                  const displayReason = entry.reason || entry.serviceKey || "-";
                  return (
                    <div key={entry.id} className={styles.ledgerRow}>
                      <span className={styles.ledgerIcon}>{isSpend ? copy.spendIcon : copy.grantIcon}</span>
                      <div className={styles.ledgerContent}>
                        {/* 날짜 */}
                        <p className={styles.ledgerDate}>
                          {formatDateTime(entry.createdAt, formatLocale)}
                        </p>
                        {/* 상품명 + 금액 */}
                        <div className={styles.ledgerMain}>
                          <p className={styles.ledgerName}>{displayReason}</p>
                          <span className={styles.ledgerAmount}>
                            {prefix}{formatMonthlyCredits(entry.amount, copy, formatLocale)}
                          </span>
                        </div>
                        {/* 잔여 이용권 혜택 */}
                        <p className={styles.ledgerAfter}>
                          {copy.afterBalance}&nbsp;
                          <strong>
                              {formatMonthlyCredits(entry.afterBalance, copy, formatLocale)}
                          </strong>
                        </p>
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
          className={styles.surface}
        >
          <h2 className={styles.sectionTitle}>{copy.paymentsTitle}</h2>
          {paymentsError ? (
            <div className={styles.error} role="alert">
              <p>{paymentsError}</p>
              <button
                type="button"
                onClick={() => { fetchPaymentsSection(); }}
                className={styles.errorAction}
              >
                {copy.retryPayments}
              </button>
            </div>
          ) : payments.length === 0 && !isLoading ? (
            <div className={styles.emptyState}>
              <p>{copy.emptyPayments}</p>
            </div>
          ) : (
            <div className={styles.paymentList}>
              {payments.map((p) => {
                const order = adaptOrderToViewModel(p as PaymentOrderRecord, lang);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { void loadOrderDetail(p); }}
                    className={styles.paymentRow}
                    aria-label={`${order.title} ${order.statusLabel}`}
                  >
                    <div className={styles.paymentTop}>
                      <p className={styles.paymentTitle}>
                        {order.amount ? copy.paymentAmount(formatWon(order.amount.value, copy, formatLocale)) : order.title}
                      </p>
                      <span className={orderStatusClass(order.status)}>
                        {order.statusLabel}
                      </span>
                    </div>
                    <div className={styles.paymentMetaGrid}>
                      <p className={styles.paymentMeta}>{copy.paidAt(formatDateTime(order.purchasedAt, formatLocale))}</p>
                      <p className={styles.paymentMeta}>{copy.paymentMethod(order.paymentMethod || "-")}</p>
                    </div>
                    <span className={styles.detailLink}>{lang === "ko" ? "상세 확인 ›" : "View details ›"}</span>
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
        <section className={styles.guide}>
          <h3 className={styles.guideTitle}>{copy.guideTitle}</h3>
          <ul className={styles.guideList}>
            {copy.guideItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

      </div>
    </main>
  );
}
