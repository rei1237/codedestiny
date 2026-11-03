import type {RuntimeLocale} from '@/lib/i18n/dictionary';

const copy = {
  ko: {note:'토스 단건 결제 · 추가 질문 1회 포함', policy:'결제 단계에서 토스 단건 결제를 확인해요. 결과를 받은 뒤 같은 상담 근거로 추가 질문 1회를 할 수 있어요.', action:'상담 시작하기'},
  en: {note:'One-time Toss payment · One follow-up question included', policy:'Check the one-time Toss payment at checkout. After receiving the result, you can ask one follow-up based on the same reading.', action:'Start consultation'},
  ja: {note:'トスの都度払い・追加質問1回を含む', policy:'決済画面でトスの都度払いを確認します。結果を受け取った後、同じ鑑定に基づく追加質問を1回できます。', action:'相談を始める'},
  'zh-CN': {note:'Toss单次支付 · 含1次追问', policy:'请在支付步骤确认Toss单次支付。收到结果后，可以根据同一次解读追问1次。', action:'开始咨询'},
  'zh-TW': {note:'Toss單次付款 · 含1次追問', policy:'請在付款步驟確認Toss單次付款。收到結果後，可以根據同一次解讀追問1次。', action:'開始諮詢'},
} as const;

export function tossTeaPaymentCopy(locale: RuntimeLocale) {
  return copy[locale as keyof typeof copy] || copy.en;
}
