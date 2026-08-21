// 네이티브 앱 웹뷰 홈(app/app/) 전체가 공유하는 로케일 카피.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface AppSpotlightCopy {
  title: string;
  subtitle: string;
  description: string;
}

export interface AppPassPlanCopy {
  title: string;
  blurb: string;
  profileLabel: string;
}

export interface AppCopy {
  homeAria: string;
  accountSectionAria: string;
  brandTagline: string;
  passNavLabel: string;

  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  freeSajuButton: string;
  tarotCardButton: string;

  spotlightSectionAria: string;
  spotlightHeading: string;
  openTeaHouseLink: string;
  spotlight: {
    "fortune-tea-house": AppSpotlightCopy;
    "neo-operation-room": AppSpotlightCopy & { badge: string };
  };

  categorySectionAria: string;
  categoryHeading: string;
  freeNow: string;
  passOrPayment: string;

  authError: string;
  restorePurchases: string;
  checkingPurchases: string;
  restoreFailed: string;
  restoredCountTemplate: string;
  noPurchasesToRestore: string;

  passStorePageTitle: string;
  passStorePageDescription: string;
  passStoreSectionAria: string;
  passPlans: {
    standard: AppPassPlanCopy;
    premium: AppPassPlanCopy;
    vvip: AppPassPlanCopy;
    family: AppPassPlanCopy;
  };
  benefitCoverageFreeTemplate: string;
  benefitAllFreeFallback: string;
  benefitUnlimitedUse: string;
  benefitDurationNote: string;
  recommendedBadge: string;
  purchaseSuspendedTitle: string;
  purchaseSuspendedBody: string;
  retryButton: string;
  verifyingButton: string;
  chargingButton: string;
  buyButton: string;
  purchaseWebOnlyMessage: string;
  purchaseConnectionNotReadyMessage: string;
  purchaseProductLoadFailedMessage: string;
  purchaseNotCompletedMessage: string;
  purchaseVerifyFailedMessage: string;
  purchaseAppliedTemplate: string;
  purchaseProcessingErrorMessage: string;
  passFooterNote: string;
}

const APP_COPY_KO: AppCopy = {
  homeAria: "Code Destiny 앱 홈",
  accountSectionAria: "계정 및 구매",
  brandTagline: "달빛 운세 홈",
  passNavLabel: "이용권",

  heroKicker: "오늘의 추천",
  heroTitle: "운명을 여는 첫 장면을 골라보세요.",
  heroBody: "사주와 타로, 별자리와 캐릭터 상담이 한 화면에서 조용히 이어집니다.",
  freeSajuButton: "무료 사주",
  tarotCardButton: "타로 카드",

  spotlightSectionAria: "대표 상담",
  spotlightHeading: "대표 모드",
  openTeaHouseLink: "찻집 열기",
  spotlight: {
    "fortune-tea-house": {
      title: "운명의 찻집",
      subtitle: "연이의 달빛 상담",
      description: "따뜻한 타로와 사주 상담이 차분히 열립니다.",
    },
    "neo-operation-room": {
      title: "네오의 팩폭 운명 전략실",
      subtitle: "전문가 상담형 전략실",
      description: "질문을 날카롭게 정리하고 다음 선택을 비춥니다.",
      badge: "이용권·월정석·결제 적용",
    },
  },

  categorySectionAria: "운세 카테고리",
  categoryHeading: "운세 카테고리",
  freeNow: "바로 열림",
  passOrPayment: "이용권·결제 적용",

  authError: "로그인을 시작할 수 없습니다.",
  restorePurchases: "구매 복원",
  checkingPurchases: "구매 내역을 확인하고 있습니다.",
  restoreFailed: "구매 복원에 실패했습니다.",
  restoredCountTemplate: "복원 완료: {n}개 권한",
  noPurchasesToRestore: "복원할 구매 권한이 없습니다.",

  passStorePageTitle: "이용권",
  passStorePageDescription: "이용권이 있으면 커버 범위 안의 기능은 결제 없이 바로 열립니다.",
  passStoreSectionAria: "이용권 구매",
  passPlans: {
    standard: { title: "스탠다드", blurb: "가볍게 시작하는 30일", profileLabel: "프로필 3개" },
    premium: { title: "프리미엄", blurb: "가장 많이 고르는 구성", profileLabel: "프로필 7개" },
    vvip: { title: "VVIP", blurb: "깊은 상담까지 넉넉하게", profileLabel: "프로필 15개" },
    family: { title: "패밀리", blurb: "모든 유료 기능 이용", profileLabel: "프로필 무제한" },
  },
  benefitCoverageFreeTemplate: "{amount} 이하 기능 무료",
  benefitAllFreeFallback: "모든 유료 기능 무료",
  benefitUnlimitedUse: "횟수 제한 없이 이용",
  benefitDurationNote: "30일 · 자동 갱신 없음",
  recommendedBadge: "추천",
  purchaseSuspendedTitle: "Google Play 이용권 신규 구매는 중단되었습니다.",
  purchaseSuspendedBody: "이용권 상품은 웹 PG 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.",
  retryButton: "다시 시도",
  verifyingButton: "확인 중",
  chargingButton: "결제 중",
  buyButton: "구매",
  purchaseWebOnlyMessage: "이용권 신규 구매는 웹 PG 단건 결제로만 진행할 수 있습니다.",
  purchaseConnectionNotReadyMessage: "앱 결제 연결이 준비되지 않았습니다. 앱을 다시 시작해 주세요.",
  purchaseProductLoadFailedMessage: "이용권 상품을 불러오지 못했습니다.",
  purchaseNotCompletedMessage: "결제가 완료되지 않았습니다.",
  purchaseVerifyFailedMessage: "결제 확인에 실패했습니다. 잠시 후 홈에서 자동으로 복구됩니다.",
  purchaseAppliedTemplate: "{title} 이용권이 적용되었습니다.",
  purchaseProcessingErrorMessage: "결제 처리 중 문제가 생겼습니다.",
  passFooterNote: "이용권은 30일간 유효하며 사용 횟수 제한이 없습니다. 자동 갱신되지 않습니다. 커버 범위를 넘는 기능은 단건 결제 또는 월정석으로 이용할 수 있습니다. 결제·환불은 Google Play 정책과 전자상거래법에 따릅니다.",
};

const APP_COPY_EN: AppCopy = {
  homeAria: "Code Destiny app home",
  accountSectionAria: "Account and purchases",
  brandTagline: "Moonlight fortune home",
  passNavLabel: "Pass",

  heroKicker: "Today's pick",
  heroTitle: "Choose the first scene that opens your destiny.",
  heroBody: "Saju, tarot, astrology, and character readings all flow quietly on one screen.",
  freeSajuButton: "Free saju",
  tarotCardButton: "Tarot cards",

  spotlightSectionAria: "Featured reading",
  spotlightHeading: "Featured modes",
  openTeaHouseLink: "Open the tea house",
  spotlight: {
    "fortune-tea-house": {
      title: "Destiny Tea House",
      subtitle: "Yeon's moonlight reading",
      description: "A warm tarot and saju reading opens calmly.",
    },
    "neo-operation-room": {
      title: "Neo's Straight-Talk Destiny War Room",
      subtitle: "Expert-style strategy room",
      description: "Sharpens your question and lights the way to your next choice.",
      badge: "Pass, moonstones, or payment",
    },
  },

  categorySectionAria: "Fortune categories",
  categoryHeading: "Fortune categories",
  freeNow: "Open now",
  passOrPayment: "Pass or payment",

  authError: "Couldn't start login.",
  restorePurchases: "Restore purchases",
  checkingPurchases: "Checking your purchase history.",
  restoreFailed: "Failed to restore your purchase.",
  restoredCountTemplate: "Restored: {n} entitlement(s)",
  noPurchasesToRestore: "No purchases to restore.",

  passStorePageTitle: "Pass",
  passStorePageDescription: "With a pass, features within its coverage open right away without payment.",
  passStoreSectionAria: "Buy a pass",
  passPlans: {
    standard: { title: "Standard", blurb: "A light 30-day start", profileLabel: "3 profiles" },
    premium: { title: "Premium", blurb: "The most popular option", profileLabel: "7 profiles" },
    vvip: { title: "VVIP", blurb: "Plenty of room for deep readings", profileLabel: "15 profiles" },
    family: { title: "Family", blurb: "Access to all paid features", profileLabel: "Unlimited profiles" },
  },
  benefitCoverageFreeTemplate: "Free for features {amount} or under",
  benefitAllFreeFallback: "All paid features free",
  benefitUnlimitedUse: "Unlimited use",
  benefitDurationNote: "30 days · no auto-renewal",
  recommendedBadge: "Recommended",
  purchaseSuspendedTitle: "New Google Play pass purchases are suspended.",
  purchaseSuspendedBody: "Passes can only be purchased through one-time web payment. Moonstones cannot be used to buy a pass.",
  retryButton: "Retry",
  verifyingButton: "Verifying",
  chargingButton: "Charging",
  buyButton: "Buy",
  purchaseWebOnlyMessage: "New pass purchases can only be made through one-time web payment.",
  purchaseConnectionNotReadyMessage: "The in-app payment connection isn't ready yet. Please restart the app.",
  purchaseProductLoadFailedMessage: "Couldn't load the pass product.",
  purchaseNotCompletedMessage: "The payment wasn't completed.",
  purchaseVerifyFailedMessage: "Failed to verify the payment. It will be automatically recovered from the home screen shortly.",
  purchaseAppliedTemplate: "Your {title} pass has been applied.",
  purchaseProcessingErrorMessage: "Something went wrong while processing the payment.",
  passFooterNote: "Passes are valid for 30 days with unlimited use, and do not auto-renew. Features beyond your pass's coverage can be used with a one-time payment or moonstones. Payments and refunds follow Google Play policy and applicable e-commerce law.",
};

const APP_COPY: Partial<Record<LoadingLocale, AppCopy>> = {
  ko: APP_COPY_KO,
  en: APP_COPY_EN,
};

export function getAppCopy(locale: LoadingLocale): AppCopy {
  return APP_COPY[locale] || APP_COPY_EN;
}

export function useAppCopy(): AppCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return getAppCopy(locale);
}

export function getAppNumberLocaleTag(locale: LoadingLocale): string {
  switch (locale) {
    case "ko": return "ko-KR";
    case "ja": return "ja-JP";
    case "zh-CN": return "zh-CN";
    case "zh-TW": return "zh-TW";
    case "vi": return "vi-VN";
    case "hi": return "hi-IN";
    case "es": return "es-ES";
    case "fr": return "fr-FR";
    case "de": return "de-DE";
    case "nl": return "nl-NL";
    case "ms": return "ms-MY";
    default: return "en-US";
  }
}
