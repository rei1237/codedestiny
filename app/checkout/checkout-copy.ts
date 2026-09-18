/**
 * 영냥이 단건 결제 화면(`/checkout`)의 화면 문구와 정책 링크.
 *
 * 🔴 **동기 표다. 사전(useT)으로 옮기지 않는다.** 이 화면은 결제 임계 화면이고 사전은 비동기 로드라
 *    첫 렌더가 빈다 — 결제 금액 옆이 한 프레임 비는 건 번역 누락보다 나쁘다. 같은 이유로
 *    `app/points/PointsClient.tsx`(POINTS_PAGE_COPY)와 `app/account/delete/AccountDeleteActions.tsx`가
 *    이미 표를 쓴다. 이 파일은 그 선례를 그대로 따른다.
 * 🔴 **폴백은 ko 가 아니라 EN 이다.** `TABLE[locale] || TABLE.ko` 로 두면 표에 없는 로케일 사용자에게
 *    한국어가 그대로 나간다(scripts/verify-locale-table-coverage.mjs 가 세는 결손이 그것이다).
 *    여기선 구조적으로 한국어 누출이 불가능하다.
 * 🔴 **ko 값을 한 글자도 바꾸지 않는다.** `scripts/lib/yeongnyangi-mobile-payment.mjs` 가 이 화면을
 *    한국어 문자열로 잡는다 — `단건 결제하기`(:146·147·310·323·338·349), `← 영냥이 방`(:311),
 *    `선택한 상담과 생선이 달라요…`(:306). 그 하네스는 package.json·CI 어디에도 배선돼 있지 않아서
 *    (전수 grep 0건) 깨져도 아무도 물지 않는다. 그래서 더 조심한다.
 *
 * 저작은 ko·en·ja·zh-CN·zh-TW 5개다. 나머지 7개 로케일은 EN 으로 떨어진다(레포 규칙).
 */
import type { LoadingLocale } from "@/constants/loadingMessages";
import type { Locale } from "@/lib/i18n/locales";
import { getLocalizedPublicHref } from "@/lib/i18n/routes";

export type CheckoutCopy = {
  navAria: string;
  backToRoom: string;
  heroAlt: string;
  hostLine1: string;
  hostLine2: string;
  title: string;
  intro: string;
  shellLoading: string;
  noticeTitle: string;
  noticeBody: string;
  noticeLink: string;
  rowComposition: string;
  chapters: (count: number) => string;
  rowMethod: string;
  methodDirect: string;
  rowAmount: string;
  policyLine1: string;
  policyLine2: string;
  payAuthChecking: string;
  payOrderChecking: string;
  payUnavailable: string;
  payOpening: string;
  payReturning: string;
  payAction: (price: string) => string;
  methodNote: string;
  cancelled: string;
  reselect: string;
  legalTerms: string;
  legalRefund: string;
  legalSupport: string;
  errResumePrepare: string;
  errProductMismatch: string;
  errPaymentFailed: string;
  errPaymentUnknown: string;
  /** 표시 통화는 원화 하나다. 표기만 로케일을 탄다(POINTS_PAGE_COPY.won 과 같은 규칙). */
  won: (amount: number, intlLocale: string) => string;
};

const EN: CheckoutCopy = {
  navAria: "Checkout navigation",
  backToRoom: "← Yeongnyangi's room",
  heroAlt: "Yeongnyangi waiting for a fish",
  hostLine1: "I'll take the fish from here.",
  hostLine2: "Let's look through your story, step by step.",
  title: "A fee for Yeongnyangi",
  intro: "Please check the fish you picked and your consultation details.",
  shellLoading: "Loading your payment details.",
  noticeTitle: "Please pick a fish again",
  noticeBody: "We couldn't confirm the product you selected. Please choose the consultation again in Yeongnyangi's room.",
  noticeLink: "Back to Yeongnyangi's room",
  rowComposition: "Consultation",
  chapters: (count) => `${count} chapter${count === 1 ? "" : "s"}`,
  rowMethod: "Payment type",
  methodDirect: "One-time payment",
  rowAmount: "Payment amount",
  policyLine1: "Yeongnyangi consultations are one-time payments only.",
  policyLine2: "Passes and moonstones do not apply.",
  payAuthChecking: "Checking your sign-in status",
  payOrderChecking: "Checking your consultation order",
  payUnavailable: "Consultation is being prepared",
  payOpening: "Opening the payment window",
  payReturning: "Returning to Yeongnyangi's room",
  payAction: (price) => `Pay ${price} once`,
  methodNote: "Choose your payment method on the next screen.",
  cancelled: "The payment was cancelled. Tap again when you're ready.",
  reselect: "Pick another fish",
  legalTerms: "Terms of service",
  legalRefund: "Refund policy",
  legalSupport: "Payment support",
  errResumePrepare: "We couldn't get ready to check your payment status. Please refresh. If you already paid, do not pay again.",
  errProductMismatch: "This consultation and fish don't match. Please choose again in Yeongnyangi's room.",
  errPaymentFailed: "We couldn't continue the payment. Please try again in a moment.",
  errPaymentUnknown: "We couldn't confirm the payment. Please try again.",
  won: (amount, intlLocale) => `KRW ${Number(amount || 0).toLocaleString(intlLocale)}`,
};

const CHECKOUT_COPY: Partial<Record<LoadingLocale, CheckoutCopy>> = {
  en: EN,
  ko: {
    navAria: "결제 화면 이동",
    backToRoom: "← 영냥이 방",
    heroAlt: "생선을 기다리는 영냥이",
    hostLine1: "생선은 내가 받을게.",
    hostLine2: "네 이야기는 차근차근 살펴보자.",
    title: "영냥이에게 건네는 복채",
    intro: "고른 생선과 상담 내용을 확인해 줘.",
    shellLoading: "결제 정보를 불러오고 있어요.",
    noticeTitle: "생선을 다시 골라 주세요",
    noticeBody: "선택한 상품을 확인하지 못했어요. 영냥이 방에서 상담을 다시 선택해 주세요.",
    noticeLink: "영냥이 방으로 돌아가기",
    rowComposition: "상담 구성",
    chapters: (count) => `${count}개 챕터`,
    rowMethod: "결제 방식",
    methodDirect: "단건 결제",
    rowAmount: "결제 금액",
    policyLine1: "영냥이 상담은 단건 결제로 이용해요.",
    policyLine2: "이용권과 월정석은 적용되지 않아요.",
    payAuthChecking: "로그인 상태 확인 중",
    payOrderChecking: "상담 주문 확인 중",
    payUnavailable: "상담 준비 중",
    payOpening: "결제창을 여는 중이에요",
    payReturning: "영냥이 방으로 돌아가는 중",
    payAction: (price) => `${price} 단건 결제하기`,
    methodNote: "결제수단은 다음 화면에서 선택해 주세요.",
    cancelled: "결제를 취소했어요. 준비되면 다시 눌러 주세요.",
    reselect: "생선 다시 고르기",
    legalTerms: "이용약관",
    legalRefund: "환불 정책",
    legalSupport: "문의하기",
    errResumePrepare: "결제 상태 확인을 준비하지 못했어요. 새로고침해 주세요. 결제를 마쳤다면 다시 결제하지 마세요.",
    errProductMismatch: "선택한 상담과 생선이 달라요. 영냥이 방에서 다시 골라 주세요.",
    errPaymentFailed: "결제를 진행하지 못했어요. 잠시 후 다시 시도해 주세요.",
    errPaymentUnknown: "결제를 확인하지 못했어요. 다시 시도해 주세요.",
    won: (amount, intlLocale) => `${Number(amount || 0).toLocaleString(intlLocale)}원`,
  },
  ja: {
    navAria: "決済画面の移動",
    backToRoom: "← ヨンニャンイの部屋",
    heroAlt: "魚を待つヨンニャンイ",
    hostLine1: "魚はわたしが受け取るね。",
    hostLine2: "あなたの話をゆっくり見ていこう。",
    title: "ヨンニャンイへのお礼",
    intro: "選んだ魚と相談内容を確認してね。",
    shellLoading: "決済情報を読み込んでいます。",
    noticeTitle: "魚をもう一度選んでください",
    noticeBody: "選択した商品を確認できませんでした。ヨンニャンイの部屋で相談をもう一度選んでください。",
    noticeLink: "ヨンニャンイの部屋に戻る",
    rowComposition: "相談の構成",
    chapters: (count) => `${count}章`,
    rowMethod: "決済方法",
    methodDirect: "単発決済",
    rowAmount: "決済金額",
    policyLine1: "ヨンニャンイの相談は単発決済のみでご利用いただけます。",
    policyLine2: "利用券と月精石は適用されません。",
    payAuthChecking: "ログイン状態を確認中",
    payOrderChecking: "相談の注文を確認中",
    payUnavailable: "相談を準備中",
    payOpening: "決済ウィンドウを開いています",
    payReturning: "ヨンニャンイの部屋に戻っています",
    payAction: (price) => `${price} を単発決済する`,
    methodNote: "お支払い方法は次の画面で選んでください。",
    cancelled: "決済をキャンセルしました。準備ができたらもう一度押してください。",
    reselect: "魚を選び直す",
    legalTerms: "利用規約",
    legalRefund: "返金ポリシー",
    legalSupport: "お支払いの問い合わせ",
    errResumePrepare: "決済状況を確認する準備ができませんでした。再読み込みしてください。すでにお支払いが完了している場合は、もう一度お支払いしないでください。",
    errProductMismatch: "選んだ相談と魚が一致しません。ヨンニャンイの部屋で選び直してください。",
    errPaymentFailed: "決済を進められませんでした。しばらくしてからもう一度お試しください。",
    errPaymentUnknown: "決済を確認できませんでした。もう一度お試しください。",
    won: (amount, intlLocale) => `${Number(amount || 0).toLocaleString(intlLocale)}ウォン`,
  },
  "zh-CN": {
    navAria: "支付页面导航",
    backToRoom: "← 灵猫的房间",
    heroAlt: "等待鱼的灵猫",
    hostLine1: "鱼就交给我吧。",
    hostLine2: "我们一起慢慢看你的故事。",
    title: "给灵猫的谢礼",
    intro: "请确认你挑选的鱼和咨询内容。",
    shellLoading: "正在加载支付信息。",
    noticeTitle: "请重新挑选一条鱼",
    noticeBody: "无法确认你选择的商品。请在灵猫的房间重新选择咨询。",
    noticeLink: "返回灵猫的房间",
    rowComposition: "咨询构成",
    chapters: (count) => `${count} 个章节`,
    rowMethod: "支付方式",
    methodDirect: "单次支付",
    rowAmount: "支付金额",
    policyLine1: "灵猫咨询仅支持单次支付。",
    policyLine2: "通行券和月精石不适用。",
    payAuthChecking: "正在确认登录状态",
    payOrderChecking: "正在确认咨询订单",
    payUnavailable: "咨询准备中",
    payOpening: "正在打开支付窗口",
    payReturning: "正在返回灵猫的房间",
    payAction: (price) => `单次支付 ${price}`,
    methodNote: "请在下一个页面选择支付方式。",
    cancelled: "已取消支付。准备好后请再次点击。",
    reselect: "重新挑选鱼",
    legalTerms: "服务条款",
    legalRefund: "退款政策",
    legalSupport: "支付咨询",
    errResumePrepare: "未能准备好确认支付状态。请刷新页面。如果你已完成支付，请不要重复支付。",
    errProductMismatch: "所选咨询与鱼不一致。请在灵猫的房间重新选择。",
    errPaymentFailed: "未能继续支付。请稍后再试。",
    errPaymentUnknown: "未能确认支付。请再试一次。",
    won: (amount, intlLocale) => `${Number(amount || 0).toLocaleString(intlLocale)} 韩元`,
  },
  "zh-TW": {
    navAria: "付款頁面導覽",
    backToRoom: "← 靈貓的房間",
    heroAlt: "等待魚的靈貓",
    hostLine1: "魚就交給我吧。",
    hostLine2: "我們一起慢慢看你的故事。",
    title: "給靈貓的謝禮",
    intro: "請確認你挑選的魚和諮詢內容。",
    shellLoading: "正在載入付款資訊。",
    noticeTitle: "請重新挑選一條魚",
    noticeBody: "無法確認你選擇的商品。請在靈貓的房間重新選擇諮詢。",
    noticeLink: "返回靈貓的房間",
    rowComposition: "諮詢組成",
    chapters: (count) => `${count} 個章節`,
    rowMethod: "付款方式",
    methodDirect: "單次付款",
    rowAmount: "付款金額",
    policyLine1: "靈貓諮詢僅支援單次付款。",
    policyLine2: "通行券與月精石不適用。",
    payAuthChecking: "正在確認登入狀態",
    payOrderChecking: "正在確認諮詢訂單",
    payUnavailable: "諮詢準備中",
    payOpening: "正在開啟付款視窗",
    payReturning: "正在返回靈貓的房間",
    payAction: (price) => `單次付款 ${price}`,
    methodNote: "請在下一個頁面選擇付款方式。",
    cancelled: "已取消付款。準備好後請再次點擊。",
    reselect: "重新挑選魚",
    legalTerms: "服務條款",
    legalRefund: "退款政策",
    legalSupport: "付款諮詢",
    errResumePrepare: "未能準備好確認付款狀態。請重新整理頁面。若你已完成付款，請勿重複付款。",
    errProductMismatch: "所選諮詢與魚不一致。請在靈貓的房間重新選擇。",
    errPaymentFailed: "未能繼續付款。請稍後再試。",
    errPaymentUnknown: "未能確認付款。請再試一次。",
    won: (amount, intlLocale) => `${Number(amount || 0).toLocaleString(intlLocale)} 韓元`,
  },
};

/** 표에 없는 로케일은 영어를 쓴다 — 한국어로 떨어뜨리지 않는다. */
export function getCheckoutCopy(locale: LoadingLocale): CheckoutCopy {
  return CHECKOUT_COPY[locale] || EN;
}

/** 화면 언어 → 정책 페이지가 실제로 존재하는 로케일. 표에 없으면 영어다. */
const POLICY_LOCALE_BY_LANG: Record<LoadingLocale, Locale> = {
  ko: "ko", en: "en", ja: "ja", "zh-CN": "zh", "zh-TW": "zh-TW",
  vi: "en", hi: "en", es: "en", fr: "en", de: "en", nl: "en", ms: "en",
};

/**
 * 결제 화면 하단 정책 링크의 실제 URL.
 *
 * 🔴 URL 표를 여기에 다시 적지 않는다. 정본은 `lib/i18n/routes.ts` 이고, 라우트가 바뀌면 여기도
 *    같이 바뀐다. 결제창(js/core/checkout-entry.js)이 표를 손으로 들고 있는 건 그 파일이 UMD 라
 *    import 를 못 하기 때문이지, 표가 둘이어야 해서가 아니다.
 */
export function resolveCheckoutPolicyHrefs(lang: LoadingLocale) {
  const target: Locale = POLICY_LOCALE_BY_LANG[lang] || "en";
  const contact = getLocalizedPublicHref("/contact", target);
  // 🔴 TRUST_LOCALES(ja·en·zh)에 없는 로케일은 /contact 가 한국어 페이지 그대로 돌아온다. 번체가 여기
  //    해당한다 — /zh-tw/contact 라우트가 없다. 결제창의 POLICY_LINKS_BY_LANG 과 같은 규칙으로 영어
  //    문의로 보낸다. 번체 contact 가 생기면 이 분기는 저절로 풀린다.
  const supportPath = target !== "ko" && contact === "/contact" ? getLocalizedPublicHref("/contact", "en") : contact;
  return {
    terms: `${getLocalizedPublicHref("/terms", target)}/`,
    refund: `${getLocalizedPublicHref("/refund-policy", target)}/`,
    support: `${supportPath}/#payment-help`,
  };
}
