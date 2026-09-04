"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

/**
 * SubscriptionStatusCard.tsx
 * 이용권 이용권 상태를 시각적으로 표시하는 카드 컴포넌트
 */

type SubscriptionTier = "free" | "standard" | "premium" | "vvip" | "family";

type SubscriptionStatus = {
  tier: SubscriptionTier;
  isActive: boolean;
  startedAt?: string | null;
  expiresAt: string | null;
  profileLimit: number;
  durationMonths?: number;
  lowBalanceWarning?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancelRequestedAt?: string | null;
};

type Props = {
  subscription: SubscriptionStatus;
};

const TIER_META: Record<SubscriptionTier, {
  icon: string;
  coinValue: number;
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  dot: string;
}> = {
  free: {
    icon: "🌙",
    coinValue: 0,
    bg: "from-slate-950/95 via-[#151a3d]/92 to-[#281a4d]/90",
    border: "border-white/15",
    badge: "bg-white/10 text-slate-100 ring-1 ring-white/15",
    badgeText: "FREE",
    dot: "bg-slate-300",
  },
  standard: {
    icon: "🌔",
    coinValue: 115,
    bg: "from-[#111936]/95 via-[#27305d]/92 to-[#4a3a72]/90",
    border: "border-[#e9d18a]/45",
    badge: "bg-gradient-to-r from-[#d8bd72] to-[#f5df9d] text-[#1d1834]",
    badgeText: "STANDARD",
    dot: "bg-[#f5df9d]",
  },
  premium: {
    icon: "🌕",
    coinValue: 360,
    bg: "from-[#101832]/95 via-[#352553]/92 to-[#604f88]/90",
    border: "border-[#cab8ff]/45",
    badge: "bg-gradient-to-r from-[#cab8ff] to-[#f2d48f] text-[#17142b]",
    badgeText: "PREMIUM",
    dot: "bg-[#cab8ff]",
  },
  vvip: {
    icon: "🌌",
    coinValue: 700,
    bg: "from-[#091126]/95 via-[#24164d]/92 to-[#42306f]/90",
    border: "border-[#f3dd9a]/55",
    badge: "bg-gradient-to-r from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff] text-[#11142a]",
    badgeText: "VVIP",
    dot: "bg-[#f3dd9a]",
  },
  family: {
    icon: "∞",
    coinValue: 3000,
    bg: "from-[#07150f]/95 via-[#123a2c]/92 to-[#374b2b]/90",
    border: "border-emerald-200/55",
    badge: "bg-gradient-to-r from-emerald-200 via-[#f3dd9a] to-[#8cb8ff] text-[#07150f]",
    badgeText: "FAMILY",
    dot: "bg-emerald-200",
  },
};

type TierCopy = {
  label: string;
  desc: string;
  profileMax: string;
  freeUpTo: string | null;
};

type SubscriptionStatusCopy = {
  ariaLabel: string;
  eyebrow: string;
  fallbackBenefit: string;
  duration30: string;
  currentUsing: (label: string) => string;
  summary: (input: { label: string; benefit: string; duration: string; value: string }) => string;
  wonEquivalent: (value: number, locale: string) => string;
  basePolicy: string;
  startDate: string;
  expiryDate: string;
  daysLeft: (days: number) => string;
  profileMax: string;
  singlePayment: string;
  autoPayment: string;
  autoPaymentValue: string;
  refundLink: string;
  familySinglePayment: string;
  standardSinglePayment: string;
  lowBalance: string;
  expiringSoon: (days: number) => { prefix: string; suffix: string };
  cancelAtPeriodEnd: string;
  expired: string;
  inactiveNote: string;
  /** 월 최대 한도 소진 시 잔여 기간과 무관하게 이용권이 종료된다는 고지(2026-09-04 정책). */
  terminationNote: string;
  tiers: Record<SubscriptionTier, TierCopy>;
};

const SUBSCRIPTION_STATUS_COPY: Record<LoadingLocale, SubscriptionStatusCopy> = {
  ko: {
    ariaLabel: "현재 이용권 상태",
    eyebrow: "나의 달빛 이용권 혜택",
    fallbackBenefit: "단건 결제 가능",
    duration30: "30일",
    currentUsing: (label) => `현재 ${label} 이용 중 · 만료일까지 이용 가능`,
    summary: ({ label, benefit, duration, value }) => `${label} · ${benefit} / ${duration} · ${value}`,
    wonEquivalent: (value, locale) => `${value.toLocaleString(locale)}원 상당`,
    basePolicy: "기본 결제 단위는 원화이며 한도 초과 서비스와 PDF는 상품별 단건 결제로 이용할 수 있습니다.",
    startDate: "시작일",
    expiryDate: "만료일",
    daysLeft: (days) => `${days}일 남음`,
    profileMax: "프로필 최대",
    singlePayment: "단건 결제",
    autoPayment: "자동결제 여부",
    autoPaymentValue: "자동결제 아님 · 만료 후 직접 재구매",
    refundLink: "환불 요청 안내 보기",
    familySinglePayment: "Family 이용권으로 모든 서비스가 무료 처리됩니다.",
    standardSinglePayment: "한도 초과 서비스와 PDF는 상품별 원화 단건 결제로 이용할 수 있습니다.",
    lowBalance: "월 최대 한도가 얼마 남지 않았습니다. 한도를 모두 사용하면 남은 기간과 관계없이 이용권이 종료되고, 추가 유료 콘텐츠는 상품별 원화 단건 결제로 이용할 수 있습니다.",
    expiringSoon: (days) => ({ prefix: `이용권이 ${days}일 후`, suffix: "만료됩니다. 계속 이용하려면 30일 이용권을 다시 결제해 주세요." }),
    cancelAtPeriodEnd: "현재 혜택은 만료일까지 유지됩니다. 이 이용권은 반복 결제되지 않습니다.",
    expired: "이용권이 만료되었습니다. 30일 이용권을 다시 결제해 주세요.",
    inactiveNote: "단건 결제 가능 · 콘텐츠 가치는 원화 기준으로 표시됩니다",
    terminationNote: "월 최대 한도를 모두 사용하면 남은 기간과 관계없이 이용권이 종료됩니다. 새로 구매하면 그날부터 30일이 다시 시작됩니다.",
    tiers: {
      free: {
        label: "무료 플랜",
        desc: "기본 운세 서비스를 무료로 이용 중입니다. 단건 결제 서비스는 원화 결제로 이용할 수 있습니다.",
        profileMax: "1개",
        freeUpTo: null,
      },
      standard: {
        label: "스탠다드 꿀 30일",
        desc: "일반 유료 서비스 5,000원 이하 이용 · PDF 별도 원화 결제 · 최대 3개 프로필",
        profileMax: "3개",
        freeUpTo: "일반 5,000원 이하 이용 가능",
      },
      premium: {
        label: "프리미엄 꿀 30일",
        desc: "일반 유료 서비스 10,000원 이하 이용 · PDF 별도 원화 결제 · 최대 7개 프로필",
        profileMax: "7개",
        freeUpTo: "일반 10,000원 이하 이용 가능",
      },
      vvip: {
        label: "VVIP 꿀단지 30일",
        desc: "일반 유료 서비스 20,000원 이하 이용 · PDF 별도 원화 결제 · 최대 15개 프로필",
        profileMax: "15개",
        freeUpTo: "일반 20,000원 이하 이용 가능",
      },
      family: {
        label: "Code Destiny Family 30일",
        desc: "PDF 포함 모든 유료 서비스 무료 · 프로필 수정·삭제 무료, 제한 없음",
        profileMax: "무제한",
        freeUpTo: "모든 유료/PDF 서비스 무료",
      },
    },
  },
  en: {
    ariaLabel: "Current pass status",
    eyebrow: "My Moonlight Pass benefits",
    fallbackBenefit: "Single payments available",
    duration30: "30 days",
    currentUsing: (label) => `${label} is active · Available until the expiration date`,
    summary: ({ label, benefit, duration, value }) => `${label} · ${benefit} / ${duration} · ${value}`,
    wonEquivalent: (value, locale) => `Worth KRW ${value.toLocaleString(locale)}`,
    basePolicy: "The default payment unit is KRW. Services above your pass limit and PDFs can be purchased separately.",
    startDate: "Start date",
    expiryDate: "Expiration date",
    daysLeft: (days) => `${days} days left`,
    profileMax: "Profile limit",
    singlePayment: "Single payment",
    autoPayment: "Auto-payment",
    autoPaymentValue: "No auto-payment · Buy again after expiration",
    refundLink: "View refund request guide",
    familySinglePayment: "The Family pass covers every service at no additional charge.",
    standardSinglePayment: "Services above your limit and PDFs can be purchased separately in KRW.",
    lowBalance: "Your monthly allowance is nearly used up. Once it is fully used the pass ends regardless of the days left, and additional paid content can be purchased separately in KRW.",
    expiringSoon: (days) => ({ prefix: `Your pass expires in ${days} days`, suffix: "Please purchase a new 30-day pass to keep using benefits." }),
    cancelAtPeriodEnd: "Current benefits remain until expiration. This pass does not renew automatically.",
    expired: "Your pass has expired. Please purchase a new 30-day pass.",
    inactiveNote: "Single payments available · Content value is shown in KRW",
    terminationNote: "If the monthly allowance is fully used, the pass ends regardless of the days left. Buying a new pass starts another 30 days from that day.",
    tiers: {
      free: {
        label: "Free plan",
        desc: "You are using the basic fortune services for free. Paid single-use services are available in KRW.",
        profileMax: "1 profile",
        freeUpTo: null,
      },
      standard: {
        label: "Standard Honey 30-day",
        desc: "General paid services up to KRW 5,000 · PDFs billed separately · Up to 3 profiles",
        profileMax: "3 profiles",
        freeUpTo: "General services up to KRW 5,000",
      },
      premium: {
        label: "Premium Honey 30-day",
        desc: "General paid services up to KRW 10,000 · PDFs billed separately · Up to 7 profiles",
        profileMax: "7 profiles",
        freeUpTo: "General services up to KRW 10,000",
      },
      vvip: {
        label: "VVIP Honey Jar 30-day",
        desc: "General paid services up to KRW 20,000 · PDFs billed separately · Up to 15 profiles",
        profileMax: "15 profiles",
        freeUpTo: "General services up to KRW 20,000",
      },
      family: {
        label: "Code Destiny Family 30-day",
        desc: "All paid services including PDFs · Free profile edits and deletion · No limit",
        profileMax: "Unlimited",
        freeUpTo: "All paid/PDF services included",
      },
    },
  },
  ja: {
    ariaLabel: "現在の利用券ステータス",
    eyebrow: "私の月明かり利用券特典",
    fallbackBenefit: "単品決済が利用できます",
    duration30: "30日",
    currentUsing: (label) => `現在 ${label} を利用中 · 有効期限まで使えます`,
    summary: ({ label, benefit, duration, value }) => `${label} · ${benefit} / ${duration} · ${value}`,
    wonEquivalent: (value, locale) => `${value.toLocaleString(locale)}ウォン相当`,
    basePolicy: "基本の決済単位はウォンです。上限を超えるサービスとPDFは商品ごとに単品決済で利用できます。",
    startDate: "開始日",
    expiryDate: "満了日",
    daysLeft: (days) => `残り${days}日`,
    profileMax: "プロフィール上限",
    singlePayment: "単品決済",
    autoPayment: "自動決済",
    autoPaymentValue: "自動決済なし · 満了後に再購入",
    refundLink: "返金リクエスト案内を見る",
    familySinglePayment: "Family利用券では、すべてのサービスが追加料金なしで処理されます。",
    standardSinglePayment: "上限を超えるサービスとPDFは、商品ごとにウォン単品決済で利用できます。",
    lowBalance: "月の利用上限が残りわずかです。使い切ると残り日数に関係なくパスは終了し、追加の有料コンテンツは商品ごとのウォン単品決済で利用できます。",
    expiringSoon: (days) => ({ prefix: `利用券は${days}日後に`, suffix: "満了します。続けて利用するには30日利用券を再購入してください。" }),
    cancelAtPeriodEnd: "現在の特典は満了日まで維持されます。この利用券は自動更新されません。",
    expired: "利用券は満了しました。30日利用券を再購入してください。",
    inactiveNote: "単品決済可 · コンテンツ価値はウォン基準で表示されます",
    terminationNote: "月の利用上限を使い切ると、残り日数に関係なくパスは終了します。新しく購入すると、その日から30日が改めて始まります。",
    tiers: {
      free: {
        label: "無料プラン",
        desc: "基本の占いサービスを無料で利用中です。単品決済サービスはウォン決済で利用できます。",
        profileMax: "1件",
        freeUpTo: null,
      },
      standard: {
        label: "スタンダード蜜 30日",
        desc: "一般有料サービス5,000ウォン以下 · PDFは別途ウォン決済 · 最大3プロフィール",
        profileMax: "3件",
        freeUpTo: "一般5,000ウォン以下まで利用可能",
      },
      premium: {
        label: "プレミアム蜜 30日",
        desc: "一般有料サービス10,000ウォン以下 · PDFは別途ウォン決済 · 最大7プロフィール",
        profileMax: "7件",
        freeUpTo: "一般10,000ウォン以下まで利用可能",
      },
      vvip: {
        label: "VVIP 蜜壺 30日",
        desc: "一般有料サービス20,000ウォン以下 · PDFは別途ウォン決済 · 最大15プロフィール",
        profileMax: "15件",
        freeUpTo: "一般20,000ウォン以下まで利用可能",
      },
      family: {
        label: "Code Destiny Family 30日",
        desc: "PDFを含むすべての有料サービス · プロフィール編集/削除無料 · 制限なし",
        profileMax: "無制限",
        freeUpTo: "すべての有料/PDFサービス込み",
      },
    },
  },
  "zh-CN": {
    ariaLabel: "当前通行证状态",
    eyebrow: "我的月光通行证权益",
    fallbackBenefit: "可单次付款",
    duration30: "30天",
    currentUsing: (label) => `当前正在使用 ${label} · 有效期内可继续使用`,
    summary: ({ label, benefit, duration, value }) => `${label} · ${benefit} / ${duration} · ${value}`,
    wonEquivalent: (value, locale) => `约 ${value.toLocaleString(locale)} 韩元`,
    basePolicy: "默认付款单位为韩元。超过通行证额度的服务与PDF可按商品单独付款。",
    startDate: "开始日",
    expiryDate: "到期日",
    daysLeft: (days) => `剩余 ${days} 天`,
    profileMax: "档案上限",
    singlePayment: "单次付款",
    autoPayment: "自动续费",
    autoPaymentValue: "非自动续费 · 到期后需重新购买",
    refundLink: "查看退款申请说明",
    familySinglePayment: "Family通行证可免费使用所有服务。",
    standardSinglePayment: "超过额度的服务与PDF可按商品以韩元单独付款。",
    lowBalance: "每月额度所剩不多。用完后无论还剩多少天，通行证都会结束，额外付费内容可按商品以韩元单独付款。",
    expiringSoon: (days) => ({ prefix: `通行证将在 ${days} 天后`, suffix: "到期。如需继续使用，请重新购买30天通行证。" }),
    cancelAtPeriodEnd: "当前权益会保留到到期日。此通行证不会自动续费。",
    expired: "通行证已到期。请重新购买30天通行证。",
    inactiveNote: "可单次付款 · 内容价值以韩元显示",
    terminationNote: "用完每月额度后，无论还剩多少天，通行证都会结束。重新购买将从当天起重新开始 30 天。",
    tiers: {
      free: {
        label: "免费方案",
        desc: "你正在免费使用基础运势服务。单次付费服务可使用韩元付款。",
        profileMax: "1个",
        freeUpTo: null,
      },
      standard: {
        label: "标准蜜糖 30天",
        desc: "一般付费服务5,000韩元以下 · PDF另行韩元付款 · 最多3个档案",
        profileMax: "3个",
        freeUpTo: "可使用5,000韩元以下的一般服务",
      },
      premium: {
        label: "高级蜜糖 30天",
        desc: "一般付费服务10,000韩元以下 · PDF另行韩元付款 · 最多7个档案",
        profileMax: "7个",
        freeUpTo: "可使用10,000韩元以下的一般服务",
      },
      vvip: {
        label: "VVIP 蜜罐 30天",
        desc: "一般付费服务20,000韩元以下 · PDF另行韩元付款 · 最多15个档案",
        profileMax: "15个",
        freeUpTo: "可使用20,000韩元以下的一般服务",
      },
      family: {
        label: "Code Destiny Family 30天",
        desc: "包含PDF在内的所有付费服务 · 免费编辑/删除档案 · 无限制",
        profileMax: "无限制",
        freeUpTo: "所有付费/PDF服务均包含",
      },
    },
  },
  "zh-TW": {
    ariaLabel: "目前通行證狀態",
    eyebrow: "我的月光通行證權益",
    fallbackBenefit: "可單次付款",
    duration30: "30天",
    currentUsing: (label) => `目前正在使用 ${label} · 有效期內可繼續使用`,
    summary: ({ label, benefit, duration, value }) => `${label} · ${benefit} / ${duration} · ${value}`,
    wonEquivalent: (value, locale) => `約 ${value.toLocaleString(locale)} 韓元`,
    basePolicy: "預設付款單位為韓元。超過通行證額度的服務與PDF可依商品單獨付款。",
    startDate: "開始日",
    expiryDate: "到期日",
    daysLeft: (days) => `剩餘 ${days} 天`,
    profileMax: "檔案上限",
    singlePayment: "單次付款",
    autoPayment: "自動續費",
    autoPaymentValue: "非自動續費 · 到期後需重新購買",
    refundLink: "查看退款申請說明",
    familySinglePayment: "Family通行證可免費使用所有服務。",
    standardSinglePayment: "超過額度的服務與PDF可依商品以韓元單獨付款。",
    lowBalance: "每月額度所剩不多。用完後無論還剩多少天，通行證都會結束，額外付費內容可依商品以韓元單獨付款。",
    expiringSoon: (days) => ({ prefix: `通行證將在 ${days} 天後`, suffix: "到期。如需繼續使用，請重新購買30天通行證。" }),
    cancelAtPeriodEnd: "目前權益會保留到到期日。此通行證不會自動續費。",
    expired: "通行證已到期。請重新購買30天通行證。",
    inactiveNote: "可單次付款 · 內容價值以韓元顯示",
    terminationNote: "用完每月額度後，無論還剩多少天，通行證都會結束。重新購買將從當天起重新開始 30 天。",
    tiers: {
      free: {
        label: "免費方案",
        desc: "你正在免費使用基礎運勢服務。單次付費服務可使用韓元付款。",
        profileMax: "1個",
        freeUpTo: null,
      },
      standard: {
        label: "標準蜜糖 30天",
        desc: "一般付費服務5,000韓元以下 · PDF另行韓元付款 · 最多3個檔案",
        profileMax: "3個",
        freeUpTo: "可使用5,000韓元以下的一般服務",
      },
      premium: {
        label: "高級蜜糖 30天",
        desc: "一般付費服務10,000韓元以下 · PDF另行韓元付款 · 最多7個檔案",
        profileMax: "7個",
        freeUpTo: "可使用10,000韓元以下的一般服務",
      },
      vvip: {
        label: "VVIP 蜜罐 30天",
        desc: "一般付費服務20,000韓元以下 · PDF另行韓元付款 · 最多15個檔案",
        profileMax: "15個",
        freeUpTo: "可使用20,000韓元以下的一般服務",
      },
      family: {
        label: "Code Destiny Family 30天",
        desc: "包含PDF在內的所有付費服務 · 免費編輯/刪除檔案 · 無限制",
        profileMax: "無限制",
        freeUpTo: "所有付費/PDF服務均包含",
      },
    },
  },
  vi: null as unknown as SubscriptionStatusCopy,
  hi: null as unknown as SubscriptionStatusCopy,
  es: null as unknown as SubscriptionStatusCopy,
  fr: null as unknown as SubscriptionStatusCopy,
  de: null as unknown as SubscriptionStatusCopy,
  nl: null as unknown as SubscriptionStatusCopy,
  ms: null as unknown as SubscriptionStatusCopy,
};

for (const locale of ["vi", "hi", "es", "fr", "de", "nl", "ms"] as LoadingLocale[]) {
  SUBSCRIPTION_STATUS_COPY[locale] = SUBSCRIPTION_STATUS_COPY.en;
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

export default function SubscriptionStatusCard({ subscription }: Props) {
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = SUBSCRIPTION_STATUS_COPY[lang] || SUBSCRIPTION_STATUS_COPY.ko;
  const formatLocale = FORMAT_LOCALE_BY_LANG[lang] || FORMAT_LOCALE_BY_LANG.ko;
  const effectiveTier: SubscriptionTier = subscription.isActive ? subscription.tier : "free";
  const meta = { ...TIER_META[effectiveTier], ...copy.tiers[effectiveTier] };
  const durationLabel = copy.duration30;

  // Date validation: ensure expiresAt is a valid date string
  const toValidDate = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    try {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  };

  const validExpiresDate = toValidDate(subscription.expiresAt);
  const validStartedDate = toValidDate(subscription.startedAt);
  const startedDate = validStartedDate
    ? validStartedDate.toLocaleDateString(formatLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const expiresDate = validExpiresDate
    ? validExpiresDate.toLocaleDateString(formatLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const daysLeft = validExpiresDate
    ? Math.max(0, Math.ceil((validExpiresDate.getTime() - Date.now()) / 86_400_000))
    : null;

  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft === 0 && subscription.isActive === false;
  const isActivePass = subscription.isActive && effectiveTier !== "free";
  const wonValue = meta.coinValue * 100;
  const valueLabel = copy.wonEquivalent(wonValue, formatLocale);
  const benefitLabel = meta.freeUpTo || copy.fallbackBenefit;
  const singlePaymentCopy = effectiveTier === "family"
    ? copy.familySinglePayment
    : copy.standardSinglePayment;
  const expiringSoonCopy = daysLeft !== null ? copy.expiringSoon(daysLeft) : null;

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

  return (
    <section
      aria-label={copy.ariaLabel}
      className={`rounded-[24px] border ${meta.border} bg-gradient-to-br ${meta.bg} overflow-hidden text-slate-100 shadow-[0_18px_46px_rgba(7,10,28,0.35)]`}
    >
      {/* 상태 바 */}
      <div
        className="h-[3px] w-full"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0), #f3dd9a 24%, #cab8ff 52%, #8cb8ff 76%, rgba(255,255,255,0))",
        }}
      />

      <div className="p-5">
        {/* 헤더 행 */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{meta.icon}</span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#cab8ff]/80">{copy.eyebrow}</p>
              <p className="text-[16px] font-black text-white leading-tight">{meta.label}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11.5px] font-black shadow-sm ${meta.badge}`}>
            {meta.badgeText}
          </span>
        </div>

        {/* 상태 상세 */}
        {isActivePass ? (
          <div className="space-y-2">
            {/* 활성 상태 표시 */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
              <span className="text-[12.5px] font-bold text-[#f3dd9a]">{copy.currentUsing(meta.label)}</span>
            </div>

            <div className="rounded-[14px] border border-white/12 bg-white/8 px-3.5 py-3">
              <p className="text-[13px] font-black text-white">
                {copy.summary({ label: meta.label, benefit: benefitLabel, duration: durationLabel, value: valueLabel })}
              </p>
              <p className="mt-1 text-[11.5px] text-slate-200">
                {copy.basePolicy}
              </p>
              <p className="mt-1 text-[11.5px] text-[#f3dd9a]">
                {copy.terminationNote}
              </p>
            </div>

            {startedDate && (
              <div className="rounded-[12px] bg-white/8 border border-white/12 px-3.5 py-2.5">
                <p className="text-[10.5px] font-bold text-slate-300">{copy.startDate}</p>
                <p className="text-[13px] font-black text-white">{startedDate}</p>
              </div>
            )}

            {expiresDate && (
              <div
                className={`rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                  isExpiringSoon
                    ? "bg-orange-400/12 border border-orange-300/50"
                    : "bg-white/8 border border-white/12"
                }`}
              >
                <div>
                  <p className="text-[10.5px] font-bold text-slate-300">{copy.expiryDate}</p>
                  <p className={`text-[13px] font-black ${isExpiringSoon ? "text-orange-100" : "text-white"}`}>
                    {expiresDate}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[12px] font-black ${
                    isExpiringSoon
                      ? "bg-orange-300/20 text-orange-100"
                      : "bg-emerald-300/15 text-emerald-100"
                  }`}
                >
                  {daysLeft !== null ? copy.daysLeft(daysLeft) : ""}
                </span>
              </div>
            )}

            {/* 혜택 요약 */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
                <p className="text-[10px] text-slate-300 font-bold">{copy.profileMax}</p>
                <p className="text-[14px] font-black text-white">{meta.profileMax}</p>
              </div>
              {meta.freeUpTo && (
                <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
                  <p className="text-[10px] text-slate-300 font-bold">{benefitLabel}</p>
                  <p className="text-[12px] font-black text-white">{meta.freeUpTo}</p>
                </div>
              )}
            </div>

            <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
              <p className="text-[10px] text-slate-300 font-bold">{copy.singlePayment}</p>
              <p className="text-[12px] font-black text-white">{singlePaymentCopy}</p>
            </div>

            <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
              <p className="text-[10px] text-slate-300 font-bold">{copy.autoPayment}</p>
              <p className="text-[12px] font-black text-white">{copy.autoPaymentValue}</p>
              <a href="/terms/#refund-policy" className="mt-1 inline-flex text-[11.5px] font-black text-[#cab8ff] underline">
                {copy.refundLink}
              </a>
            </div>

            {/* 이용권 혜택 범위 안내 */}
            {subscription.lowBalanceWarning && (
              <div className="rounded-[12px] border border-orange-300/50 bg-orange-400/12 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">🔔</span>
                <p className="text-[11.5px] text-orange-100">
                  {copy.lowBalance}
                </p>
              </div>
            )}

            {/* 곧 만료 경고 */}
            {isExpiringSoon && (
              <div className="rounded-[12px] border border-orange-300/50 bg-orange-400/12 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">⏰</span>
                <p className="text-[11.5px] text-orange-100">
                  {expiringSoonCopy ? `${expiringSoonCopy.prefix} ${expiringSoonCopy.suffix}` : ""}
                </p>
              </div>
            )}

            {subscription.cancelAtPeriodEnd && (
              <div className="rounded-[12px] border border-violet-300/50 bg-violet-400/12 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-violet-500 flex-shrink-0 mt-0.5">🧭</span>
                <p className="text-[11.5px] text-violet-100">
                  {copy.cancelAtPeriodEnd}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isExpired ? (
              <div className="rounded-[12px] border border-rose-300/50 bg-rose-400/12 px-3.5 py-2.5 flex items-center gap-2">
                <span className="text-rose-500">⚠️</span>
                <p className="text-[12px] text-rose-100 font-bold">{copy.expired}</p>
              </div>
            ) : (
              <div className="rounded-[14px] border border-white/12 bg-white/8 px-3.5 py-3">
                <p className="text-[12.5px] text-slate-200">{meta.desc}</p>
                <p className="mt-1 text-[11.5px] text-[#f3dd9a]">{copy.inactiveNote}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
