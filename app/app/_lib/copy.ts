// 네이티브 앱 셸(/app) 전 화면 공용 로케일 카피.
// destiny-compass/nakshatra/feedback 의 _lib/copy.ts 와 같은 패턴 — getCurrentLoadingLocale()/languagechange 이벤트로 갱신.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type PassTier = "standard" | "premium" | "vvip" | "family";

interface PassPlanCopy {
  title: string;
  blurb: string;
  profileLabel: string;
}

export interface AppShellCopy {
  // ── app/page.tsx ──────────────────────────────────────
  appHomeAriaLabel: string;
  moonlightHomeTagline: string;
  passLinkLabel: string;
  todayRecommendLabel: string;
  heroHeadline: string;
  heroBody: string;
  freeSajuButton: string;
  tarotCardButton: string;
  spotlightAriaLabel: string;
  spotlightSectionTitle: string;
  openTeaHouseLink: string;
  categoryAriaLabel: string;
  freeAccessBadge: string;
  paidAccessBadge: string;
  spotlightTeaHouseTitle: string;
  spotlightTeaHouseSubtitle: string;
  spotlightTeaHouseDescription: string;
  spotlightNeoRoomTitle: string;
  spotlightNeoRoomSubtitle: string;
  spotlightNeoRoomDescription: string;
  spotlightNeoRoomBadge: string;

  // ── MobileAppActions ──────────────────────────────────
  accountSectionAriaLabel: string;
  authStartFailedFallback: string;
  restoreCheckingText: string;
  restoreFailedFallback: string;
  restoreCompleteText: (count: number) => string;
  restoreNoneText: string;
  restoreButtonLabel: string;

  // ── AppShell ──────────────────────────────────────────
  exitHintText: string;

  // ── PurchaseRecoveryBoot ──────────────────────────────
  pendingApprovalTitle: string;
  pendingApprovalBody: string;

  // ── store/page.tsx ────────────────────────────────────
  passPageTitle: string;
  passPageBody: string;

  // ── AppPassStoreClient ────────────────────────────────
  passPlans: Record<PassTier, PassPlanCopy>;
  benefitCoverageFree: (coverageLabel: string) => string;
  benefitAllFree: string;
  /* 🔴 구 benefitNoLimitUse("횟수 제한 없이 이용")를 대체한다(2026-08-24). 모든 등급에 월 이용
     한도가 있어 그 문구가 실제 정책과 모순됐다. 금액은 호출부가 서버 정본
     MONTHLY_PASS_LIMITS_KRW 에서 뽑아 넘긴다 — 여기에 숫자를 적으면 사본이 하나 더 생긴다. */
  benefitMonthlyCap: (capLabel: string) => string;
  benefit30Days: string;
  billingNotReadyMessage: string;
  productLoadFailedMessage: string;
  paymentIncompleteMessage: string;
  verifyFailedMessage: string;
  purchaseAppliedMessage: (title: string) => string;
  purchaseErrorGeneric: string;
  storeAriaLabel: string;
  billingNotReadyTitle: string;
  billingNotReadyBody: string;
  retryButton: string;
  recommendedBadge: string;
  verifyingButton: string;
  purchasingButton: string;
  buyButton: string;
  footerNote: string;
}

const APP_SHELL_COPY_EN: AppShellCopy = {
  appHomeAriaLabel: "Code Destiny App Home",
  moonlightHomeTagline: "Moonlight Fortune Home",
  passLinkLabel: "Pass",
  todayRecommendLabel: "Today's Pick",
  heroHeadline: "Choose the first scene that opens your destiny.",
  heroBody: "Saju and Tarot, astrology and character consultations flow quietly on one screen.",
  freeSajuButton: "Free Saju",
  tarotCardButton: "Tarot Card",
  spotlightAriaLabel: "Featured Consultations",
  spotlightSectionTitle: "Featured Modes",
  openTeaHouseLink: "Open the Tea House",
  categoryAriaLabel: "Fortune Categories",
  freeAccessBadge: "Opens Instantly",
  paidAccessBadge: "Pass · Payment Required",
  spotlightTeaHouseTitle: "Fortune Tea House",
  spotlightTeaHouseSubtitle: "Yeoni's Moonlight Consultation",
  spotlightTeaHouseDescription: "Warm Tarot and Saju consultations open calmly.",
  spotlightNeoRoomTitle: "Neo's Straight-Talk Destiny War Room",
  spotlightNeoRoomSubtitle: "Expert-consultation-style war room",
  spotlightNeoRoomDescription: "Sharpens your question and lights up your next choice.",
  spotlightNeoRoomBadge: "Pass · Moonstones · Payment Applied",

  accountSectionAriaLabel: "Account and Purchases",
  authStartFailedFallback: "Couldn't start sign-in.",
  restoreCheckingText: "Checking your purchase history.",
  restoreFailedFallback: "Couldn't restore purchases.",
  restoreCompleteText: (count) => `Restore complete: ${count} entitlement(s)`,
  restoreNoneText: "No purchase entitlements to restore.",
  restoreButtonLabel: "Restore Purchases",

  exitHintText: "Press once more to exit",

  pendingApprovalTitle: "Waiting for payment approval",
  pendingApprovalBody: "Content will unlock automatically once approved. Convenience-store or bank-transfer payments may take some time to confirm.",

  passPageTitle: "Pass",
  passPageBody: "With a pass, features within its coverage open instantly without payment.",

  passPlans: {
    standard: { title: "Standard", blurb: "A light 30-day start", profileLabel: "3 profiles" },
    premium: { title: "Premium", blurb: "The most popular choice", profileLabel: "7 profiles" },
    vvip: { title: "VVIP", blurb: "Plenty of room for deep consultations", profileLabel: "15 profiles" },
    family: { title: "Family", blurb: "Use every paid feature", profileLabel: "Unlimited profiles" },
  },
  benefitCoverageFree: (coverageLabel) => `Features up to ${coverageLabel} are free`,
  benefitAllFree: "All pass-eligible content",
  benefitMonthlyCap: (capLabel) => `Up to ${capLabel} worth per month`,
  benefit30Days: "30 days · no auto-renewal",
  billingNotReadyMessage: "The in-app payment connection isn't ready yet. Please restart the app.",
  productLoadFailedMessage: "Couldn't load the pass product.",
  paymentIncompleteMessage: "The payment wasn't completed.",
  verifyFailedMessage: "Couldn't verify the payment. It will be recovered automatically from the home screen shortly.",
  purchaseAppliedMessage: (title) => `The ${title} pass has been applied.`,
  purchaseErrorGeneric: "A problem occurred while processing the payment.",
  storeAriaLabel: "Purchase a Pass",
  billingNotReadyTitle: "Couldn't set up in-app payment.",
  billingNotReadyBody: "Check your Google Play services connection, then restart the app.",
  retryButton: "Try Again",
  recommendedBadge: "Recommended",
  verifyingButton: "Verifying",
  purchasingButton: "Processing",
  buyButton: "Buy",
  footerNote: "The pass is valid for 30 days, within each tier's monthly usage limit. It does not auto-renew. Features beyond its coverage can be used via one-time payment or moonstones. Payments and refunds follow Google Play policy and e-commerce law.",
};

const APP_SHELL_COPY: Partial<Record<LoadingLocale, AppShellCopy>> = {
  ko: {
    appHomeAriaLabel: "Code Destiny 앱 홈",
    moonlightHomeTagline: "달빛 운세 홈",
    passLinkLabel: "이용권",
    todayRecommendLabel: "오늘의 추천",
    heroHeadline: "운명을 여는 첫 장면을 골라보세요.",
    heroBody: "사주와 타로, 별자리와 캐릭터 상담이 한 화면에서 조용히 이어집니다.",
    freeSajuButton: "무료 사주",
    tarotCardButton: "타로 카드",
    spotlightAriaLabel: "대표 상담",
    spotlightSectionTitle: "대표 모드",
    openTeaHouseLink: "찻집 열기",
    categoryAriaLabel: "운세 카테고리",
    freeAccessBadge: "바로 열림",
    paidAccessBadge: "이용권·결제 적용",
    spotlightTeaHouseTitle: "운명의 찻집",
    spotlightTeaHouseSubtitle: "연이의 달빛 상담",
    spotlightTeaHouseDescription: "따뜻한 타로와 사주 상담이 차분히 열립니다.",
    spotlightNeoRoomTitle: "네오의 팩폭 운명 전략실",
    spotlightNeoRoomSubtitle: "전문가 상담형 전략실",
    spotlightNeoRoomDescription: "질문을 날카롭게 정리하고 다음 선택을 비춥니다.",
    spotlightNeoRoomBadge: "이용권·월정석·결제 적용",

    accountSectionAriaLabel: "계정 및 구매",
    authStartFailedFallback: "로그인을 시작할 수 없습니다.",
    restoreCheckingText: "구매 내역을 확인하고 있습니다.",
    restoreFailedFallback: "구매 복원에 실패했습니다.",
    restoreCompleteText: (count) => `복원 완료: ${count}개 권한`,
    restoreNoneText: "복원할 구매 권한이 없습니다.",
    restoreButtonLabel: "구매 복원",

    exitHintText: "한 번 더 누르면 종료됩니다",

    pendingApprovalTitle: "결제 승인을 기다리는 중입니다",
    pendingApprovalBody: "승인이 완료되면 콘텐츠가 자동으로 열립니다. 편의점·계좌이체 결제는 입금 확인까지 시간이 걸릴 수 있습니다.",

    passPageTitle: "이용권",
    passPageBody: "이용권이 있으면 커버 범위 안의 기능은 결제 없이 바로 열립니다.",

    passPlans: {
      standard: { title: "스탠다드", blurb: "가볍게 시작하는 30일", profileLabel: "프로필 3개" },
      premium: { title: "프리미엄", blurb: "가장 많이 고르는 구성", profileLabel: "프로필 7개" },
      vvip: { title: "VVIP", blurb: "깊은 상담까지 넉넉하게", profileLabel: "프로필 15개" },
      family: { title: "패밀리", blurb: "모든 유료 기능 이용", profileLabel: "프로필 무제한" },
    },
    benefitCoverageFree: (coverageLabel) => `${coverageLabel} 이하 기능 무료`,
    benefitAllFree: "이용권 대상 전체",
    benefitMonthlyCap: (capLabel) => `월 최대 ${capLabel} 상당`,
    benefit30Days: "30일 · 자동 갱신 없음",
    billingNotReadyMessage: "앱 결제 연결이 준비되지 않았습니다. 앱을 다시 시작해 주세요.",
    productLoadFailedMessage: "이용권 상품을 불러오지 못했습니다.",
    paymentIncompleteMessage: "결제가 완료되지 않았습니다.",
    verifyFailedMessage: "결제 확인에 실패했습니다. 잠시 후 홈에서 자동으로 복구됩니다.",
    purchaseAppliedMessage: (title) => `${title} 이용권이 적용되었습니다.`,
    purchaseErrorGeneric: "결제 처리 중 문제가 생겼습니다.",
    storeAriaLabel: "이용권 구매",
    billingNotReadyTitle: "앱 결제를 준비하지 못했습니다",
    billingNotReadyBody: "Google Play 서비스 연결을 확인한 뒤 앱을 다시 시작해 주세요.",
    retryButton: "다시 시도",
    recommendedBadge: "추천",
    verifyingButton: "확인 중",
    purchasingButton: "결제 중",
    buyButton: "구매",
    footerNote: "이용권은 30일간 유효하며, 등급별 월 이용 한도 안에서 이용합니다. 자동 갱신되지 않습니다. 커버 범위를 넘는 기능은 단건 결제 또는 월정석으로 이용할 수 있습니다. 결제·환불은 Google Play 정책과 전자상거래법에 따릅니다.",
  },
  ja: {
    appHomeAriaLabel: "Code Destiny アプリホーム",
    moonlightHomeTagline: "月光運勢ホーム",
    passLinkLabel: "利用券",
    todayRecommendLabel: "今日のおすすめ",
    heroHeadline: "運命を開く最初のシーンを選んでください。",
    heroBody: "四柱推命とタロット、占星術とキャラクター相談が一つの画面で静かに続きます。",
    freeSajuButton: "無料四柱推命",
    tarotCardButton: "タロットカード",
    spotlightAriaLabel: "代表相談",
    spotlightSectionTitle: "代表モード",
    openTeaHouseLink: "茶房を開く",
    categoryAriaLabel: "運勢カテゴリー",
    freeAccessBadge: "すぐに開く",
    paidAccessBadge: "利用券・決済適用",
    spotlightTeaHouseTitle: "運命の茶房",
    spotlightTeaHouseSubtitle: "ヨニの月光相談",
    spotlightTeaHouseDescription: "温かいタロットと四柱推命の相談が静かに開きます。",
    spotlightNeoRoomTitle: "ネオの直球運命作戦室",
    spotlightNeoRoomSubtitle: "専門家相談型作戦室",
    spotlightNeoRoomDescription: "質問を鋭く整理し、次の選択を照らします。",
    spotlightNeoRoomBadge: "利用券・月精石・決済適用",

    accountSectionAriaLabel: "アカウントと購入",
    authStartFailedFallback: "ログインを開始できません。",
    restoreCheckingText: "購入履歴を確認しています。",
    restoreFailedFallback: "購入の復元に失敗しました。",
    restoreCompleteText: (count) => `復元完了:${count}件の権限`,
    restoreNoneText: "復元する購入権限がありません。",
    restoreButtonLabel: "購入を復元",

    exitHintText: "もう一度押すと終了します",

    pendingApprovalTitle: "決済承認を待っています",
    pendingApprovalBody: "承認が完了するとコンテンツが自動的に開きます。コンビニ・口座振込決済は入金確認まで時間がかかる場合があります。",

    passPageTitle: "利用券",
    passPageBody: "利用券があれば適用範囲内の機能は決済なしですぐに開きます。",

    passPlans: {
      standard: { title: "スタンダード", blurb: "気軽に始める30日", profileLabel: "プロフィール3個" },
      premium: { title: "プレミアム", blurb: "最も選ばれる構成", profileLabel: "プロフィール7個" },
      vvip: { title: "VVIP", blurb: "深い相談まで十分に", profileLabel: "プロフィール15個" },
      family: { title: "ファミリー", blurb: "すべての有料機能を利用", profileLabel: "プロフィール無制限" },
    },
    benefitCoverageFree: (coverageLabel) => `${coverageLabel}以下の機能が無料`,
    benefitAllFree: "利用券対象コンテンツすべて",
    benefitMonthlyCap: (capLabel) => `月あたり最大${capLabel}相当`,
    benefit30Days: "30日 · 自動更新なし",
    billingNotReadyMessage: "アプリ決済の接続がまだ準備できていません。アプリを再起動してください。",
    productLoadFailedMessage: "利用券商品を読み込めませんでした。",
    paymentIncompleteMessage: "決済が完了しませんでした。",
    verifyFailedMessage: "決済確認に失敗しました。しばらくするとホームで自動的に復旧します。",
    purchaseAppliedMessage: (title) => `${title}利用券が適用されました。`,
    purchaseErrorGeneric: "決済処理中に問題が発生しました。",
    storeAriaLabel: "利用券購入",
    billingNotReadyTitle: "アプリ決済を準備できませんでした",
    billingNotReadyBody: "Google Play 開発者サービスの接続を確認してから、アプリを再起動してください。",
    retryButton: "再試行",
    recommendedBadge: "おすすめ",
    verifyingButton: "確認中",
    purchasingButton: "決済中",
    buyButton: "購入",
    footerNote: "利用券は30日間有効で、等級別の月間利用上限の範囲内でご利用いただけます。自動更新はされません。適用範囲を超える機能は都度決済または月精石で利用できます。決済・返金はGoogle Playポリシーおよび電子商取引法に従います。",
  },
  "zh-CN": {
    appHomeAriaLabel: "Code Destiny 应用主页",
    moonlightHomeTagline: "月光运势之家",
    passLinkLabel: "使用权",
    todayRecommendLabel: "今日推荐",
    heroHeadline: "选择开启命运的第一幕。",
    heroBody: "八字与塔罗、星座与角色咨询在同一画面中静静延续。",
    freeSajuButton: "免费八字",
    tarotCardButton: "塔罗牌",
    spotlightAriaLabel: "代表咨询",
    spotlightSectionTitle: "代表模式",
    openTeaHouseLink: "打开茶馆",
    categoryAriaLabel: "运势分类",
    freeAccessBadge: "立即开启",
    paidAccessBadge: "使用权·支付适用",
    spotlightTeaHouseTitle: "命运茶馆",
    spotlightTeaHouseSubtitle: "连伊的月光咨询",
    spotlightTeaHouseDescription: "温暖的塔罗与八字咨询静静展开。",
    spotlightNeoRoomTitle: "尼奥的直击命运作战室",
    spotlightNeoRoomSubtitle: "专家咨询型作战室",
    spotlightNeoRoomDescription: "犀利梳理你的问题,照亮下一步选择。",
    spotlightNeoRoomBadge: "使用权·月精石·支付适用",

    accountSectionAriaLabel: "账户与购买",
    authStartFailedFallback: "无法开始登录。",
    restoreCheckingText: "正在确认购买记录。",
    restoreFailedFallback: "恢复购买失败。",
    restoreCompleteText: (count) => `恢复完成:${count}项权限`,
    restoreNoneText: "没有可恢复的购买权限。",
    restoreButtonLabel: "恢复购买",

    exitHintText: "再按一次即可退出",

    pendingApprovalTitle: "正在等待支付审核",
    pendingApprovalBody: "审核完成后内容将自动开启。便利店·转账支付可能需要一些时间确认到账。",

    passPageTitle: "使用权",
    passPageBody: "拥有使用权后,覆盖范围内的功能无需支付即可立即开启。",

    passPlans: {
      standard: { title: "标准", blurb: "轻松开始的30天", profileLabel: "3个档案" },
      premium: { title: "高级", blurb: "最受欢迎的组合", profileLabel: "7个档案" },
      vvip: { title: "VVIP", blurb: "深度咨询也绰绰有余", profileLabel: "15个档案" },
      family: { title: "家庭版", blurb: "使用所有付费功能", profileLabel: "档案数无限制" },
    },
    benefitCoverageFree: (coverageLabel) => `${coverageLabel}以下功能免费`,
    benefitAllFree: "使用权涵盖的全部内容",
    benefitMonthlyCap: (capLabel) => `每月最多${capLabel}`,
    benefit30Days: "30天 · 不自动续订",
    billingNotReadyMessage: "应用内支付连接尚未就绪。请重新启动应用。",
    productLoadFailedMessage: "无法加载使用权商品。",
    paymentIncompleteMessage: "支付未完成。",
    verifyFailedMessage: "支付确认失败。稍后将在主页自动恢复。",
    purchaseAppliedMessage: (title) => `${title}使用权已生效。`,
    purchaseErrorGeneric: "支付处理过程中出现问题。",
    storeAriaLabel: "购买使用权",
    billingNotReadyTitle: "无法准备应用内支付",
    billingNotReadyBody: "请检查 Google Play 服务连接后重新启动应用。",
    retryButton: "重试",
    recommendedBadge: "推荐",
    verifyingButton: "确认中",
    purchasingButton: "支付中",
    buyButton: "购买",
    footerNote: "使用权有效期30天,在各等级的每月使用额度内使用。不会自动续订。超出覆盖范围的功能可通过单次支付或月精石使用。支付·退款遵循Google Play政策及电子商务法。",
  },
  "zh-TW": {
    appHomeAriaLabel: "Code Destiny 應用程式首頁",
    moonlightHomeTagline: "月光運勢之家",
    passLinkLabel: "使用權",
    todayRecommendLabel: "今日推薦",
    heroHeadline: "選擇開啟命運的第一幕。",
    heroBody: "八字與塔羅、星座與角色諮詢在同一畫面中靜靜延續。",
    freeSajuButton: "免費八字",
    tarotCardButton: "塔羅牌",
    spotlightAriaLabel: "代表諮詢",
    spotlightSectionTitle: "代表模式",
    openTeaHouseLink: "打開茶館",
    categoryAriaLabel: "運勢分類",
    freeAccessBadge: "立即開啟",
    paidAccessBadge: "使用權·付款適用",
    spotlightTeaHouseTitle: "命運茶館",
    spotlightTeaHouseSubtitle: "連伊的月光諮詢",
    spotlightTeaHouseDescription: "溫暖的塔羅與八字諮詢靜靜展開。",
    spotlightNeoRoomTitle: "尼歐的直擊命運作戰室",
    spotlightNeoRoomSubtitle: "專家諮詢型作戰室",
    spotlightNeoRoomDescription: "犀利梳理你的問題,照亮下一步選擇。",
    spotlightNeoRoomBadge: "使用權·月精石·付款適用",

    accountSectionAriaLabel: "帳戶與購買",
    authStartFailedFallback: "無法開始登入。",
    restoreCheckingText: "正在確認購買記錄。",
    restoreFailedFallback: "恢復購買失敗。",
    restoreCompleteText: (count) => `恢復完成:${count}項權限`,
    restoreNoneText: "沒有可恢復的購買權限。",
    restoreButtonLabel: "恢復購買",

    exitHintText: "再按一次即可退出",

    pendingApprovalTitle: "正在等待付款審核",
    pendingApprovalBody: "審核完成後內容將自動開啟。超商·轉帳付款可能需要一些時間確認到帳。",

    passPageTitle: "使用權",
    passPageBody: "擁有使用權後,涵蓋範圍內的功能無需付款即可立即開啟。",

    passPlans: {
      standard: { title: "標準", blurb: "輕鬆開始的30天", profileLabel: "3個檔案" },
      premium: { title: "高級", blurb: "最受歡迎的組合", profileLabel: "7個檔案" },
      vvip: { title: "VVIP", blurb: "深度諮詢也綽綽有餘", profileLabel: "15個檔案" },
      family: { title: "家庭版", blurb: "使用所有付費功能", profileLabel: "檔案數無限制" },
    },
    benefitCoverageFree: (coverageLabel) => `${coverageLabel}以下功能免費`,
    benefitAllFree: "使用權涵蓋的全部內容",
    benefitMonthlyCap: (capLabel) => `每月最多${capLabel}`,
    benefit30Days: "30天 · 不自動續訂",
    billingNotReadyMessage: "應用程式內付款連線尚未就緒。請重新啟動應用程式。",
    productLoadFailedMessage: "無法載入使用權商品。",
    paymentIncompleteMessage: "付款未完成。",
    verifyFailedMessage: "付款確認失敗。稍後將在首頁自動恢復。",
    purchaseAppliedMessage: (title) => `${title}使用權已生效。`,
    purchaseErrorGeneric: "付款處理過程中發生問題。",
    storeAriaLabel: "購買使用權",
    billingNotReadyTitle: "無法準備應用程式內付款",
    billingNotReadyBody: "請確認 Google Play 服務連線後重新啟動應用程式。",
    retryButton: "重試",
    recommendedBadge: "推薦",
    verifyingButton: "確認中",
    purchasingButton: "付款中",
    buyButton: "購買",
    footerNote: "使用權有效期30天,在各等級的每月使用額度內使用。不會自動續訂。超出涵蓋範圍的功能可透過單次付款或月精石使用。付款·退款遵循Google Play政策及電子商務法。",
  },
  vi: {
    appHomeAriaLabel: "Trang chủ ứng dụng Code Destiny",
    moonlightHomeTagline: "Trang Nhà Vận Mệnh Ánh Trăng",
    passLinkLabel: "Vé sử dụng",
    todayRecommendLabel: "Gợi ý hôm nay",
    heroHeadline: "Chọn cảnh đầu tiên mở ra vận mệnh của bạn.",
    heroBody: "Saju và Tarot, chiêm tinh và tư vấn nhân vật tiếp diễn nhẹ nhàng trên một màn hình.",
    freeSajuButton: "Saju miễn phí",
    tarotCardButton: "Bài Tarot",
    spotlightAriaLabel: "Tư vấn tiêu biểu",
    spotlightSectionTitle: "Chế độ tiêu biểu",
    openTeaHouseLink: "Mở Trà Quán",
    categoryAriaLabel: "Danh mục vận mệnh",
    freeAccessBadge: "Mở ngay",
    paidAccessBadge: "Áp dụng vé/thanh toán",
    spotlightTeaHouseTitle: "Trà Quán Vận Mệnh",
    spotlightTeaHouseSubtitle: "Tư vấn ánh trăng của Yeoni",
    spotlightTeaHouseDescription: "Các buổi tư vấn Tarot và Saju ấm áp mở ra nhẹ nhàng.",
    spotlightNeoRoomTitle: "Phòng Chiến Lược Vận Mệnh Thẳng Thắn của Neo",
    spotlightNeoRoomSubtitle: "Phòng chiến lược kiểu tư vấn chuyên gia",
    spotlightNeoRoomDescription: "Làm rõ sắc bén câu hỏi của bạn và soi sáng lựa chọn tiếp theo.",
    spotlightNeoRoomBadge: "Áp dụng vé·đá trăng·thanh toán",

    accountSectionAriaLabel: "Tài khoản và mua hàng",
    authStartFailedFallback: "Không thể bắt đầu đăng nhập.",
    restoreCheckingText: "Đang kiểm tra lịch sử mua hàng.",
    restoreFailedFallback: "Không thể khôi phục giao dịch mua.",
    restoreCompleteText: (count) => `Khôi phục hoàn tất: ${count} quyền lợi`,
    restoreNoneText: "Không có quyền mua nào để khôi phục.",
    restoreButtonLabel: "Khôi phục giao dịch mua",

    exitHintText: "Nhấn thêm một lần nữa để thoát",

    pendingApprovalTitle: "Đang chờ phê duyệt thanh toán",
    pendingApprovalBody: "Nội dung sẽ tự động mở khóa khi được phê duyệt. Thanh toán qua cửa hàng tiện lợi hoặc chuyển khoản có thể mất thời gian để xác nhận.",

    passPageTitle: "Vé sử dụng",
    passPageBody: "Có vé sử dụng, các tính năng trong phạm vi bao phủ sẽ mở ngay mà không cần thanh toán.",

    passPlans: {
      standard: { title: "Tiêu chuẩn", blurb: "Khởi đầu nhẹ nhàng 30 ngày", profileLabel: "3 hồ sơ" },
      premium: { title: "Cao cấp", blurb: "Lựa chọn phổ biến nhất", profileLabel: "7 hồ sơ" },
      vvip: { title: "VVIP", blurb: "Đủ rộng rãi cho tư vấn chuyên sâu", profileLabel: "15 hồ sơ" },
      family: { title: "Gia đình", blurb: "Sử dụng mọi tính năng trả phí", profileLabel: "Hồ sơ không giới hạn" },
    },
    benefitCoverageFree: (coverageLabel) => `Tính năng đến ${coverageLabel} là miễn phí`,
    benefitAllFree: "Toàn bộ nội dung áp dụng gói",
    benefitMonthlyCap: (capLabel) => `Tối đa ${capLabel} mỗi tháng`,
    benefit30Days: "30 ngày · không tự động gia hạn",
    billingNotReadyMessage: "Kết nối thanh toán trong ứng dụng chưa sẵn sàng. Vui lòng khởi động lại ứng dụng.",
    productLoadFailedMessage: "Không thể tải sản phẩm vé sử dụng.",
    paymentIncompleteMessage: "Thanh toán chưa hoàn tất.",
    verifyFailedMessage: "Xác minh thanh toán thất bại. Nội dung sẽ được khôi phục tự động tại trang chủ sau một lúc.",
    purchaseAppliedMessage: (title) => `Vé sử dụng ${title} đã được áp dụng.`,
    purchaseErrorGeneric: "Đã xảy ra sự cố trong quá trình xử lý thanh toán.",
    storeAriaLabel: "Mua vé sử dụng",
    billingNotReadyTitle: "Không thể chuẩn bị thanh toán trong ứng dụng",
    billingNotReadyBody: "Vui lòng kiểm tra kết nối Dịch vụ Google Play rồi khởi động lại ứng dụng.",
    retryButton: "Thử lại",
    recommendedBadge: "Đề xuất",
    verifyingButton: "Đang xác minh",
    purchasingButton: "Đang xử lý",
    buyButton: "Mua",
    footerNote: "Vé sử dụng có hiệu lực trong 30 ngày, trong hạn mức sử dụng hằng tháng của từng hạng. Không tự động gia hạn. Các tính năng vượt phạm vi bao phủ có thể dùng qua thanh toán một lần hoặc đá trăng. Thanh toán·hoàn tiền tuân theo chính sách Google Play và luật thương mại điện tử.",
  },
  hi: {
    appHomeAriaLabel: "Code Destiny ऐप होम",
    moonlightHomeTagline: "चंद्रकिरण भाग्य होम",
    passLinkLabel: "पास",
    todayRecommendLabel: "आज की पसंद",
    heroHeadline: "अपनी नियति खोलने वाला पहला दृश्य चुनें।",
    heroBody: "साजू और टैरो, ज्योतिष और कैरेक्टर परामर्श एक ही स्क्रीन पर शांति से चलते हैं।",
    freeSajuButton: "मुफ़्त साजू",
    tarotCardButton: "टैरो कार्ड",
    spotlightAriaLabel: "प्रमुख परामर्श",
    spotlightSectionTitle: "प्रमुख मोड",
    openTeaHouseLink: "टी हाउस खोलें",
    categoryAriaLabel: "भाग्य श्रेणियाँ",
    freeAccessBadge: "तुरंत खुलता है",
    paidAccessBadge: "पास · भुगतान लागू",
    spotlightTeaHouseTitle: "भाग्य चाय घर",
    spotlightTeaHouseSubtitle: "योनी का चांदनी परामर्श",
    spotlightTeaHouseDescription: "गर्मजोशी भरे टैरो और साजू परामर्श शांति से खुलते हैं।",
    spotlightNeoRoomTitle: "नियो का सीधी बात भाग्य रणनीति कक्ष",
    spotlightNeoRoomSubtitle: "विशेषज्ञ-परामर्श शैली रणनीति कक्ष",
    spotlightNeoRoomDescription: "आपके प्रश्न को तीखा करता है और अगले विकल्प को रोशन करता है।",
    spotlightNeoRoomBadge: "पास · मूनस्टोन · भुगतान लागू",

    accountSectionAriaLabel: "खाता और खरीदारी",
    authStartFailedFallback: "साइन इन शुरू नहीं हो सका।",
    restoreCheckingText: "आपके खरीद इतिहास की जाँच हो रही है।",
    restoreFailedFallback: "खरीद बहाल नहीं हो सकी।",
    restoreCompleteText: (count) => `बहाली पूर्ण: ${count} अधिकार`,
    restoreNoneText: "बहाल करने के लिए कोई खरीद अधिकार नहीं है।",
    restoreButtonLabel: "खरीद बहाल करें",

    exitHintText: "बाहर निकलने के लिए फिर से दबाएँ",

    pendingApprovalTitle: "भुगतान अनुमोदन की प्रतीक्षा हो रही है",
    pendingApprovalBody: "अनुमोदन पूरा होने पर सामग्री स्वतः खुल जाएगी। सुविधा स्टोर या बैंक हस्तांतरण भुगतान की पुष्टि में समय लग सकता है।",

    passPageTitle: "पास",
    passPageBody: "पास होने पर, इसके कवरेज के भीतर की सुविधाएँ बिना भुगतान के तुरंत खुल जाती हैं।",

    passPlans: {
      standard: { title: "स्टैंडर्ड", blurb: "हल्की 30-दिन की शुरुआत", profileLabel: "3 प्रोफ़ाइलें" },
      premium: { title: "प्रीमियम", blurb: "सबसे लोकप्रिय विकल्प", profileLabel: "7 प्रोफ़ाइलें" },
      vvip: { title: "VVIP", blurb: "गहन परामर्श के लिए पर्याप्त", profileLabel: "15 प्रोफ़ाइलें" },
      family: { title: "फ़ैमिली", blurb: "सभी सशुल्क सुविधाओं का उपयोग करें", profileLabel: "असीमित प्रोफ़ाइलें" },
    },
    benefitCoverageFree: (coverageLabel) => `${coverageLabel} तक की सुविधाएँ मुफ़्त`,
    benefitAllFree: "पास में शामिल सभी सामग्री",
    benefitMonthlyCap: (capLabel) => `हर महीने ${capLabel} तक`,
    benefit30Days: "30 दिन · कोई ऑटो-नवीनीकरण नहीं",
    billingNotReadyMessage: "ऐप भुगतान कनेक्शन अभी तैयार नहीं है। कृपया ऐप को फिर से शुरू करें।",
    productLoadFailedMessage: "पास उत्पाद लोड नहीं हो सका।",
    paymentIncompleteMessage: "भुगतान पूरा नहीं हुआ।",
    verifyFailedMessage: "भुगतान सत्यापन विफल रहा। यह जल्द ही होम स्क्रीन पर स्वतः बहाल हो जाएगा।",
    purchaseAppliedMessage: (title) => `${title} पास लागू कर दिया गया है।`,
    purchaseErrorGeneric: "भुगतान संसाधित करते समय समस्या हुई।",
    storeAriaLabel: "पास खरीदें",
    billingNotReadyTitle: "ऐप भुगतान तैयार नहीं हो सका",
    billingNotReadyBody: "Google Play सेवाओं का कनेक्शन जांचें, फिर ऐप को फिर से शुरू करें।",
    retryButton: "फिर कोशिश करें",
    recommendedBadge: "अनुशंसित",
    verifyingButton: "सत्यापित हो रहा है",
    purchasingButton: "भुगतान हो रहा है",
    buyButton: "खरीदें",
    footerNote: "पास 30 दिनों के लिए वैध है और हर स्तर की मासिक उपयोग सीमा के भीतर काम करता है। यह स्वतः नवीनीकृत नहीं होता। कवरेज से परे सुविधाओं का उपयोग एकमुश्त भुगतान या मूनस्टोन से किया जा सकता है। भुगतान·धनवापसी Google Play नीति और ई-कॉमर्स कानून का पालन करते हैं।",
  },
  es: {
    appHomeAriaLabel: "Inicio de la app Code Destiny",
    moonlightHomeTagline: "Inicio de Fortuna a la Luz de la Luna",
    passLinkLabel: "Pase",
    todayRecommendLabel: "Recomendado de hoy",
    heroHeadline: "Elige la primera escena que abre tu destino.",
    heroBody: "Saju y Tarot, astrología y consultas de personajes fluyen tranquilamente en una sola pantalla.",
    freeSajuButton: "Saju gratis",
    tarotCardButton: "Carta de Tarot",
    spotlightAriaLabel: "Consultas destacadas",
    spotlightSectionTitle: "Modos destacados",
    openTeaHouseLink: "Abrir la Casa de Té",
    categoryAriaLabel: "Categorías de fortuna",
    freeAccessBadge: "Se abre al instante",
    paidAccessBadge: "Pase · Pago aplicado",
    spotlightTeaHouseTitle: "Casa de Té del Destino",
    spotlightTeaHouseSubtitle: "Consulta a la luz de la luna de Yeoni",
    spotlightTeaHouseDescription: "Cálidas consultas de Tarot y Saju se abren con calma.",
    spotlightNeoRoomTitle: "Sala de Estrategia del Destino Directa de Neo",
    spotlightNeoRoomSubtitle: "Sala de estrategia estilo consulta de experto",
    spotlightNeoRoomDescription: "Afila tu pregunta e ilumina tu próxima decisión.",
    spotlightNeoRoomBadge: "Pase · Piedras lunares · Pago aplicado",

    accountSectionAriaLabel: "Cuenta y compras",
    authStartFailedFallback: "No se pudo iniciar el inicio de sesión.",
    restoreCheckingText: "Comprobando tu historial de compras.",
    restoreFailedFallback: "No se pudieron restaurar las compras.",
    restoreCompleteText: (count) => `Restauración completa: ${count} derecho(s)`,
    restoreNoneText: "No hay derechos de compra para restaurar.",
    restoreButtonLabel: "Restaurar compras",

    exitHintText: "Pulsa una vez más para salir",

    pendingApprovalTitle: "Esperando la aprobación del pago",
    pendingApprovalBody: "El contenido se desbloqueará automáticamente una vez aprobado. Los pagos por tienda de conveniencia o transferencia bancaria pueden tardar en confirmarse.",

    passPageTitle: "Pase",
    passPageBody: "Con un pase, las funciones dentro de su cobertura se abren al instante sin pago.",

    passPlans: {
      standard: { title: "Estándar", blurb: "Un inicio ligero de 30 días", profileLabel: "3 perfiles" },
      premium: { title: "Premium", blurb: "La opción más popular", profileLabel: "7 perfiles" },
      vvip: { title: "VVIP", blurb: "Amplio espacio para consultas profundas", profileLabel: "15 perfiles" },
      family: { title: "Familiar", blurb: "Usa todas las funciones de pago", profileLabel: "Perfiles ilimitados" },
    },
    benefitCoverageFree: (coverageLabel) => `Funciones hasta ${coverageLabel} son gratis`,
    benefitAllFree: "Todo el contenido incluido en el pase",
    benefitMonthlyCap: (capLabel) => `Hasta ${capLabel} al mes`,
    benefit30Days: "30 días · sin renovación automática",
    billingNotReadyMessage: "La conexión de pago en la app aún no está lista. Reinicia la app.",
    productLoadFailedMessage: "No se pudo cargar el producto del pase.",
    paymentIncompleteMessage: "El pago no se completó.",
    verifyFailedMessage: "No se pudo verificar el pago. Se recuperará automáticamente desde la pantalla de inicio en breve.",
    purchaseAppliedMessage: (title) => `El pase ${title} se ha aplicado.`,
    purchaseErrorGeneric: "Ocurrió un problema al procesar el pago.",
    storeAriaLabel: "Comprar un pase",
    billingNotReadyTitle: "No se pudo preparar el pago en la app",
    billingNotReadyBody: "Comprueba la conexión con los servicios de Google Play y reinicia la app.",
    retryButton: "Reintentar",
    recommendedBadge: "Recomendado",
    verifyingButton: "Verificando",
    purchasingButton: "Procesando",
    buyButton: "Comprar",
    footerNote: "El pase es válido por 30 días, dentro del límite de uso mensual de cada nivel. No se renueva automáticamente. Las funciones fuera de su cobertura se pueden usar mediante pago único o piedras lunares. Los pagos y reembolsos siguen la política de Google Play y la ley de comercio electrónico.",
  },
  fr: {
    appHomeAriaLabel: "Accueil de l'app Code Destiny",
    moonlightHomeTagline: "Accueil Fortune au Clair de Lune",
    passLinkLabel: "Pass",
    todayRecommendLabel: "Recommandation du jour",
    heroHeadline: "Choisissez la première scène qui ouvre votre destin.",
    heroBody: "Saju et Tarot, astrologie et consultations de personnages s'enchaînent calmement sur un seul écran.",
    freeSajuButton: "Saju gratuit",
    tarotCardButton: "Carte de Tarot",
    spotlightAriaLabel: "Consultations phares",
    spotlightSectionTitle: "Modes phares",
    openTeaHouseLink: "Ouvrir la Maison de Thé",
    categoryAriaLabel: "Catégories de fortune",
    freeAccessBadge: "S'ouvre instantanément",
    paidAccessBadge: "Pass · Paiement appliqué",
    spotlightTeaHouseTitle: "Maison de Thé du Destin",
    spotlightTeaHouseSubtitle: "Consultation au clair de lune de Yeoni",
    spotlightTeaHouseDescription: "Des consultations chaleureuses de Tarot et Saju s'ouvrent calmement.",
    spotlightNeoRoomTitle: "Salle de Stratégie du Destin Franche de Neo",
    spotlightNeoRoomSubtitle: "Salle de stratégie style consultation d'expert",
    spotlightNeoRoomDescription: "Aiguise votre question et éclaire votre prochain choix.",
    spotlightNeoRoomBadge: "Pass · Pierres de lune · Paiement appliqué",

    accountSectionAriaLabel: "Compte et achats",
    authStartFailedFallback: "Impossible de démarrer la connexion.",
    restoreCheckingText: "Vérification de votre historique d'achats.",
    restoreFailedFallback: "Impossible de restaurer les achats.",
    restoreCompleteText: (count) => `Restauration terminée : ${count} droit(s)`,
    restoreNoneText: "Aucun droit d'achat à restaurer.",
    restoreButtonLabel: "Restaurer les achats",

    exitHintText: "Appuyez encore une fois pour quitter",

    pendingApprovalTitle: "En attente d'approbation du paiement",
    pendingApprovalBody: "Le contenu se débloquera automatiquement une fois approuvé. Les paiements par magasin de proximité ou virement bancaire peuvent prendre du temps à confirmer.",

    passPageTitle: "Pass",
    passPageBody: "Avec un pass, les fonctionnalités dans sa couverture s'ouvrent instantanément sans paiement.",

    passPlans: {
      standard: { title: "Standard", blurb: "Un départ léger de 30 jours", profileLabel: "3 profils" },
      premium: { title: "Premium", blurb: "Le choix le plus populaire", profileLabel: "7 profils" },
      vvip: { title: "VVIP", blurb: "Largement suffisant pour des consultations approfondies", profileLabel: "15 profils" },
      family: { title: "Famille", blurb: "Utilisez toutes les fonctionnalités payantes", profileLabel: "Profils illimités" },
    },
    benefitCoverageFree: (coverageLabel) => `Les fonctionnalités jusqu'à ${coverageLabel} sont gratuites`,
    benefitAllFree: "Tout le contenu inclus dans le pass",
    benefitMonthlyCap: (capLabel) => `Jusqu'à ${capLabel} par mois`,
    benefit30Days: "30 jours · pas de renouvellement automatique",
    billingNotReadyMessage: "La connexion de paiement dans l'app n'est pas encore prête. Veuillez redémarrer l'app.",
    productLoadFailedMessage: "Impossible de charger le produit du pass.",
    paymentIncompleteMessage: "Le paiement n'a pas été complété.",
    verifyFailedMessage: "Impossible de vérifier le paiement. Il sera récupéré automatiquement depuis l'écran d'accueil sous peu.",
    purchaseAppliedMessage: (title) => `Le pass ${title} a été appliqué.`,
    purchaseErrorGeneric: "Un problème est survenu lors du traitement du paiement.",
    storeAriaLabel: "Acheter un pass",
    billingNotReadyTitle: "Impossible de préparer le paiement dans l'app",
    billingNotReadyBody: "Vérifiez la connexion aux services Google Play, puis redémarrez l'app.",
    retryButton: "Réessayer",
    recommendedBadge: "Recommandé",
    verifyingButton: "Vérification",
    purchasingButton: "Traitement",
    buyButton: "Acheter",
    footerNote: "Le pass est valable 30 jours, dans la limite d'utilisation mensuelle de chaque niveau. Il ne se renouvelle pas automatiquement. Les fonctionnalités hors de sa couverture peuvent être utilisées via un paiement unique ou des pierres de lune. Les paiements et remboursements suivent la politique de Google Play et le droit du commerce électronique.",
  },
  de: {
    appHomeAriaLabel: "Code Destiny App-Startseite",
    moonlightHomeTagline: "Mondlicht-Schicksals-Startseite",
    passLinkLabel: "Pass",
    todayRecommendLabel: "Heutige Empfehlung",
    heroHeadline: "Wähle die erste Szene, die dein Schicksal eröffnet.",
    heroBody: "Saju und Tarot, Astrologie und Charakterberatungen laufen ruhig auf einem Bildschirm ab.",
    freeSajuButton: "Kostenloses Saju",
    tarotCardButton: "Tarotkarte",
    spotlightAriaLabel: "Empfohlene Beratungen",
    spotlightSectionTitle: "Empfohlene Modi",
    openTeaHouseLink: "Teehaus öffnen",
    categoryAriaLabel: "Schicksalskategorien",
    freeAccessBadge: "Öffnet sofort",
    paidAccessBadge: "Pass · Zahlung erforderlich",
    spotlightTeaHouseTitle: "Schicksals-Teehaus",
    spotlightTeaHouseSubtitle: "Yeonis Mondlicht-Beratung",
    spotlightTeaHouseDescription: "Warme Tarot- und Saju-Beratungen öffnen sich ruhig.",
    spotlightNeoRoomTitle: "Neos Klartext-Schicksals-Kriegsraum",
    spotlightNeoRoomSubtitle: "Kriegsraum im Experten-Beratungsstil",
    spotlightNeoRoomDescription: "Schärft deine Frage und erhellt deine nächste Wahl.",
    spotlightNeoRoomBadge: "Pass · Mondsteine · Zahlung erforderlich",

    accountSectionAriaLabel: "Konto und Käufe",
    authStartFailedFallback: "Anmeldung konnte nicht gestartet werden.",
    restoreCheckingText: "Kaufhistorie wird überprüft.",
    restoreFailedFallback: "Käufe konnten nicht wiederhergestellt werden.",
    restoreCompleteText: (count) => `Wiederherstellung abgeschlossen: ${count} Berechtigung(en)`,
    restoreNoneText: "Keine Kaufberechtigungen zum Wiederherstellen.",
    restoreButtonLabel: "Käufe wiederherstellen",

    exitHintText: "Noch einmal drücken zum Beenden",

    pendingApprovalTitle: "Warten auf Zahlungsgenehmigung",
    pendingApprovalBody: "Inhalte werden nach Genehmigung automatisch freigeschaltet. Zahlungen per Convenience-Store oder Banküberweisung können etwas Zeit zur Bestätigung benötigen.",

    passPageTitle: "Pass",
    passPageBody: "Mit einem Pass öffnen sich Funktionen innerhalb seiner Abdeckung sofort ohne Zahlung.",

    passPlans: {
      standard: { title: "Standard", blurb: "Ein leichter 30-Tage-Start", profileLabel: "3 Profile" },
      premium: { title: "Premium", blurb: "Die beliebteste Wahl", profileLabel: "7 Profile" },
      vvip: { title: "VVIP", blurb: "Reichlich Raum für tiefe Beratungen", profileLabel: "15 Profile" },
      family: { title: "Familie", blurb: "Nutze alle kostenpflichtigen Funktionen", profileLabel: "Unbegrenzte Profile" },
    },
    benefitCoverageFree: (coverageLabel) => `Funktionen bis ${coverageLabel} sind kostenlos`,
    benefitAllFree: "Alle im Pass enthaltenen Inhalte",
    benefitMonthlyCap: (capLabel) => `Bis zu ${capLabel} pro Monat`,
    benefit30Days: "30 Tage · keine automatische Verlängerung",
    billingNotReadyMessage: "Die In-App-Zahlungsverbindung ist noch nicht bereit. Bitte starte die App neu.",
    productLoadFailedMessage: "Das Pass-Produkt konnte nicht geladen werden.",
    paymentIncompleteMessage: "Die Zahlung wurde nicht abgeschlossen.",
    verifyFailedMessage: "Die Zahlung konnte nicht verifiziert werden. Sie wird in Kürze automatisch auf dem Startbildschirm wiederhergestellt.",
    purchaseAppliedMessage: (title) => `Der ${title}-Pass wurde angewendet.`,
    purchaseErrorGeneric: "Bei der Zahlungsverarbeitung ist ein Problem aufgetreten.",
    storeAriaLabel: "Pass kaufen",
    billingNotReadyTitle: "In-App-Zahlung konnte nicht vorbereitet werden",
    billingNotReadyBody: "Prüfe die Verbindung zu den Google Play-Diensten und starte die App neu.",
    retryButton: "Erneut versuchen",
    recommendedBadge: "Empfohlen",
    verifyingButton: "Wird geprüft",
    purchasingButton: "Wird verarbeitet",
    buyButton: "Kaufen",
    footerNote: "Der Pass ist 30 Tage gültig, im Rahmen des monatlichen Nutzungslimits der jeweiligen Stufe. Er verlängert sich nicht automatisch. Funktionen außerhalb seiner Abdeckung können über Einmalzahlung oder Mondsteine genutzt werden. Zahlungen und Rückerstattungen folgen der Google-Play-Richtlinie und dem E-Commerce-Recht.",
  },
  nl: {
    appHomeAriaLabel: "Code Destiny app-startpagina",
    moonlightHomeTagline: "Maanlicht Lots-thuis",
    passLinkLabel: "Pas",
    todayRecommendLabel: "Aanbeveling van vandaag",
    heroHeadline: "Kies de eerste scène die je lot opent.",
    heroBody: "Saju en Tarot, astrologie en karakteradviezen verlopen rustig op één scherm.",
    freeSajuButton: "Gratis Saju",
    tarotCardButton: "Tarotkaart",
    spotlightAriaLabel: "Uitgelichte adviezen",
    spotlightSectionTitle: "Uitgelichte modi",
    openTeaHouseLink: "Theehuis openen",
    categoryAriaLabel: "Lotscategorieën",
    freeAccessBadge: "Opent direct",
    paidAccessBadge: "Pas · Betaling toegepast",
    spotlightTeaHouseTitle: "Theehuis van het Lot",
    spotlightTeaHouseSubtitle: "Yeoni's maanlichtadvies",
    spotlightTeaHouseDescription: "Warme Tarot- en Saju-adviezen openen rustig.",
    spotlightNeoRoomTitle: "Neo's Rechttoe-rechtaan Lotstrategiekamer",
    spotlightNeoRoomSubtitle: "Strategiekamer in expertadviesstijl",
    spotlightNeoRoomDescription: "Verscherpt je vraag en verlicht je volgende keuze.",
    spotlightNeoRoomBadge: "Pas · Maanstenen · Betaling toegepast",

    accountSectionAriaLabel: "Account en aankopen",
    authStartFailedFallback: "Kon niet inloggen.",
    restoreCheckingText: "Je aankoopgeschiedenis wordt gecontroleerd.",
    restoreFailedFallback: "Kon aankopen niet herstellen.",
    restoreCompleteText: (count) => `Herstel voltooid: ${count} recht(en)`,
    restoreNoneText: "Geen aankooprechten om te herstellen.",
    restoreButtonLabel: "Aankopen herstellen",

    exitHintText: "Druk nog een keer om af te sluiten",

    pendingApprovalTitle: "Wachten op betalingsgoedkeuring",
    pendingApprovalBody: "Content wordt automatisch ontgrendeld zodra goedgekeurd. Betalingen via gemakswinkel of bankoverschrijving kunnen even duren voordat ze bevestigd zijn.",

    passPageTitle: "Pas",
    passPageBody: "Met een pas openen functies binnen de dekking direct zonder betaling.",

    passPlans: {
      standard: { title: "Standaard", blurb: "Een lichte start van 30 dagen", profileLabel: "3 profielen" },
      premium: { title: "Premium", blurb: "De populairste keuze", profileLabel: "7 profielen" },
      vvip: { title: "VVIP", blurb: "Ruim voldoende voor diepgaand advies", profileLabel: "15 profielen" },
      family: { title: "Familie", blurb: "Gebruik alle betaalde functies", profileLabel: "Onbeperkte profielen" },
    },
    benefitCoverageFree: (coverageLabel) => `Functies tot ${coverageLabel} zijn gratis`,
    benefitAllFree: "Alle content die de pass dekt",
    benefitMonthlyCap: (capLabel) => `Tot ${capLabel} per maand`,
    benefit30Days: "30 dagen · geen automatische verlenging",
    billingNotReadyMessage: "De in-app betalingsverbinding is nog niet klaar. Herstart de app.",
    productLoadFailedMessage: "Kon het pasproduct niet laden.",
    paymentIncompleteMessage: "De betaling is niet voltooid.",
    verifyFailedMessage: "Kon de betaling niet verifiëren. Deze wordt binnenkort automatisch hersteld vanaf het startscherm.",
    purchaseAppliedMessage: (title) => `De ${title}-pas is toegepast.`,
    purchaseErrorGeneric: "Er is een probleem opgetreden bij het verwerken van de betaling.",
    storeAriaLabel: "Pas kopen",
    billingNotReadyTitle: "In-app betaling kon niet worden voorbereid",
    billingNotReadyBody: "Controleer de verbinding met Google Play-services en herstart de app.",
    retryButton: "Opnieuw proberen",
    recommendedBadge: "Aanbevolen",
    verifyingButton: "Verifiëren",
    purchasingButton: "Verwerken",
    buyButton: "Kopen",
    footerNote: "De pas is 30 dagen geldig, binnen de maandelijkse gebruikslimiet van elk niveau. Wordt niet automatisch verlengd. Functies buiten de dekking kunnen worden gebruikt via eenmalige betaling of maanstenen. Betalingen en terugbetalingen volgen het Google Play-beleid en de e-commercewetgeving.",
  },
  ms: {
    appHomeAriaLabel: "Laman utama aplikasi Code Destiny",
    moonlightHomeTagline: "Laman Utama Nasib Cahaya Bulan",
    passLinkLabel: "Pas",
    todayRecommendLabel: "Cadangan hari ini",
    heroHeadline: "Pilih adegan pertama yang membuka takdir anda.",
    heroBody: "Saju dan Tarot, astrologi dan konsultasi watak berlangsung dengan tenang pada satu skrin.",
    freeSajuButton: "Saju percuma",
    tarotCardButton: "Kad Tarot",
    spotlightAriaLabel: "Konsultasi pilihan",
    spotlightSectionTitle: "Mod pilihan",
    openTeaHouseLink: "Buka Rumah Teh",
    categoryAriaLabel: "Kategori nasib",
    freeAccessBadge: "Terbuka serta-merta",
    paidAccessBadge: "Pas · Pembayaran dikenakan",
    spotlightTeaHouseTitle: "Rumah Teh Takdir",
    spotlightTeaHouseSubtitle: "Konsultasi cahaya bulan Yeoni",
    spotlightTeaHouseDescription: "Konsultasi Tarot dan Saju yang hangat terbuka dengan tenang.",
    spotlightNeoRoomTitle: "Bilik Strategi Takdir Berterus-terang Neo",
    spotlightNeoRoomSubtitle: "Bilik strategi gaya konsultasi pakar",
    spotlightNeoRoomDescription: "Mempertajamkan soalan anda dan menerangi pilihan seterusnya.",
    spotlightNeoRoomBadge: "Pas · Batu bulan · Pembayaran dikenakan",

    accountSectionAriaLabel: "Akaun dan pembelian",
    authStartFailedFallback: "Tidak dapat memulakan log masuk.",
    restoreCheckingText: "Menyemak sejarah pembelian anda.",
    restoreFailedFallback: "Tidak dapat memulihkan pembelian.",
    restoreCompleteText: (count) => `Pemulihan selesai: ${count} kelayakan`,
    restoreNoneText: "Tiada kelayakan pembelian untuk dipulihkan.",
    restoreButtonLabel: "Pulihkan pembelian",

    exitHintText: "Tekan sekali lagi untuk keluar",

    pendingApprovalTitle: "Menunggu kelulusan pembayaran",
    pendingApprovalBody: "Kandungan akan dibuka secara automatik setelah diluluskan. Pembayaran kedai serbaneka atau pindahan bank mungkin mengambil masa untuk disahkan.",

    passPageTitle: "Pas",
    passPageBody: "Dengan pas, ciri dalam liputannya terbuka serta-merta tanpa pembayaran.",

    passPlans: {
      standard: { title: "Standard", blurb: "Permulaan ringan 30 hari", profileLabel: "3 profil" },
      premium: { title: "Premium", blurb: "Pilihan paling popular", profileLabel: "7 profil" },
      vvip: { title: "VVIP", blurb: "Ruang mencukupi untuk konsultasi mendalam", profileLabel: "15 profil" },
      family: { title: "Keluarga", blurb: "Gunakan semua ciri berbayar", profileLabel: "Profil tanpa had" },
    },
    benefitCoverageFree: (coverageLabel) => `Ciri sehingga ${coverageLabel} adalah percuma`,
    benefitAllFree: "Semua kandungan yang dilindungi pas",
    benefitMonthlyCap: (capLabel) => `Sehingga ${capLabel} sebulan`,
    benefit30Days: "30 hari · tiada pembaharuan automatik",
    billingNotReadyMessage: "Sambungan pembayaran dalam aplikasi belum bersedia. Sila mulakan semula aplikasi.",
    productLoadFailedMessage: "Tidak dapat memuatkan produk pas.",
    paymentIncompleteMessage: "Pembayaran tidak selesai.",
    verifyFailedMessage: "Pengesahan pembayaran gagal. Ia akan dipulihkan secara automatik di skrin utama tidak lama lagi.",
    purchaseAppliedMessage: (title) => `Pas ${title} telah digunakan.`,
    purchaseErrorGeneric: "Masalah berlaku semasa memproses pembayaran.",
    storeAriaLabel: "Beli pas",
    billingNotReadyTitle: "Pembayaran dalam aplikasi tidak dapat disediakan",
    billingNotReadyBody: "Semak sambungan Perkhidmatan Google Play, kemudian mulakan semula aplikasi.",
    retryButton: "Cuba lagi",
    recommendedBadge: "Disyorkan",
    verifyingButton: "Mengesahkan",
    purchasingButton: "Memproses",
    buyButton: "Beli",
    footerNote: "Pas sah selama 30 hari, dalam had penggunaan bulanan bagi setiap peringkat. Ia tidak diperbaharui secara automatik. Ciri di luar liputannya boleh digunakan melalui pembayaran sekali atau batu bulan. Pembayaran·bayaran balik mematuhi dasar Google Play dan undang-undang e-dagang.",
  },
};

export function getAppShellCopy(locale: LoadingLocale): AppShellCopy {
  return APP_SHELL_COPY[locale] || APP_SHELL_COPY_EN;
}

export function useAppShellCopy(): AppShellCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getAppShellCopy(locale);
}
