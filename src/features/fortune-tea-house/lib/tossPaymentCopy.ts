import type {RuntimeLocale} from '@/lib/i18n/dictionary';

const copy = {
  ko: {loginRequired:'로그인 후 카드를 준비할 수 있어요.',accessDenied:'이 상담에 접근할 권한을 확인하지 못했어요.',loginAction:'토스로 로그인하기',pricePending:'가격은 상담 확인 단계에서 확인',note:'토스 단건 결제 · 추가 질문 1회 포함', policy:'결제 단계에서 토스 단건 결제를 확인해요. 결과를 받은 뒤 같은 상담 근거로 추가 질문 1회를 할 수 있어요.', action:'상담 시작하기'},
  en: {loginRequired:'Sign in to prepare the cards.',accessDenied:'We could not confirm access to this consultation.',loginAction:'Sign in with Toss',pricePending:'Price shown when the consultation is confirmed',note:'One-time Toss payment · One follow-up question included', policy:'Check the one-time Toss payment at checkout. After receiving the result, you can ask one follow-up based on the same reading.', action:'Start consultation'},
  ja: {loginRequired:'カードの準備にはログインが必要です。',accessDenied:'この相談へのアクセス権限を確認できませんでした。',loginAction:'トスでログイン',pricePending:'料金は相談内容の確認時に表示',note:'トスの都度払い・追加質問1回を含む', policy:'決済画面でトスの都度払いを確認します。結果を受け取った後、同じ鑑定に基づく追加質問を1回できます。', action:'相談を始める'},
  'zh-CN': {loginRequired:'登录后可以准备卡牌。',accessDenied:'无法确认此咨询的访问权限。',loginAction:'使用Toss登录',pricePending:'确认咨询内容时显示价格',note:'Toss单次支付 · 含1次追问', policy:'请在支付步骤确认Toss单次支付。收到结果后，可以根据同一次解读追问1次。', action:'开始咨询'},
  'zh-TW': {loginRequired:'登入後可以準備卡牌。',accessDenied:'無法確認此諮詢的存取權限。',loginAction:'使用Toss登入',pricePending:'確認諮詢內容時顯示價格',note:'Toss單次付款 · 含1次追問', policy:'請在付款步驟確認Toss單次付款。收到結果後，可以根據同一次解讀追問1次。', action:'開始諮詢'},
} as const;

export function tossTeaPaymentCopy(locale: RuntimeLocale) {
  return copy[locale as keyof typeof copy] || copy.en;
}
