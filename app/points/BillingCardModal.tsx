"use client";

/**
 * BillingCardModal.tsx
 * 30일 이용권 결제용 카드 입력 모달
 * 이미지 참조: 토스페이먼츠 카드 번호 입력 → 본인인증 → 결제 정보 확인
 */

import { useCallback, useRef, useState } from "react";
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type Props = {
  buyerName: string;
  buyerPhone?: string;
  onSuccess: (billingKey: string, cardInfo: RegisteredCard) => void;
  onClose: () => void;
  apiBase: string;
};

export type RegisteredCard = {
  billingKey: string;
  cardName: string;
  cardNumber: string; // 마스킹: **** **** **** 1234
  registeredAt: string;
};

type Step = "input" | "auth" | "confirm" | "done";

type BillingCardCopy = {
  step: Record<Step, string>;
  secureTest: string;
  errors: {
    cardNumber: string;
    expiry: string;
    agreement: string;
    phone: string;
    otpSendFailed: string;
    otpSendFailedShort: string;
    name: string;
    birth: string;
    otp: string;
    registerFailed: string;
    registerFailedShort: string;
  };
  labels: {
    cardNumber: string;
    expiry: string;
    agreement: string;
    viewTerms: string;
    noCharge: string;
    next: string;
    otpSent: string;
    name: string;
    birthNumber: string;
    carrierPhone: string;
    otpCode: string;
    sendOtp: string;
    resendOtp: string;
    receiveOtpAgain: string;
    confirm: string;
    productInfo: string;
    productName: string;
    passName: string;
    paymentUser: string;
    paymentInfo: string;
    totalAmount: string;
    selectedPassAmount: string;
    recurringNote: string;
    registerCard: string;
    registerCardLoading: string;
    doneBenefit: string;
    close: string;
    carrierLabels: Record<string, string>;
  };
  placeholders: {
    name: string;
    birthGender: string;
    phone: string;
    otp: string;
  };
  cardName: string;
};

const BILLING_CARD_COPY: Record<LoadingLocale, BillingCardCopy> = {
  ko: {
    step: {
      input: "결제할 카드를 입력해주세요",
      auth: "본인 정보를 입력해주세요",
      confirm: "결제 정보를 확인해주세요",
      done: "결제 카드 확인 완료",
    },
    secureTest: "아임포트테스트",
    errors: {
      cardNumber: "카드 번호를 정확히 입력해 주세요.",
      expiry: "유효기간을 입력해 주세요.",
      agreement: "서비스 이용 약관에 동의해 주세요.",
      phone: "휴대폰 번호를 입력해 주세요.",
      otpSendFailed: "인증번호 발송에 실패했습니다.",
      otpSendFailedShort: "인증번호 발송 실패",
      name: "이름을 입력해 주세요.",
      birth: "주민등록번호 앞 6자리를 입력해 주세요.",
      otp: "인증번호를 입력해 주세요.",
      registerFailed: "카드 등록에 실패했습니다.",
      registerFailedShort: "카드 등록 실패",
    },
    labels: {
      cardNumber: "카드번호",
      expiry: "유효기간",
      agreement: "(필수) 서비스 이용 약관, 개인정보 처리 동의",
      viewTerms: "내용 보기",
      noCharge: "실제 결제가 발생하는 테스트가 아닙니다",
      next: "다음",
      otpSent: "인증번호를 보냈어요",
      name: "이름",
      birthNumber: "주민등록번호 앞 7자리",
      carrierPhone: "통신사 · 휴대폰번호",
      otpCode: "인증번호",
      sendOtp: "인증번호 발송",
      resendOtp: "재발송",
      receiveOtpAgain: "인증번호 다시 받기",
      confirm: "확인",
      productInfo: "상품정보",
      productName: "상품명",
      passName: "30일 이용권",
      paymentUser: "결제자",
      paymentInfo: "결제정보",
      totalAmount: "총 결제금액",
      selectedPassAmount: "선택한 이용권 금액",
      recurringNote: "결제는 선택한 기간의 달빛 이용권 단건 결제이며 반복 결제가 설정되지 않습니다.",
      registerCard: "결제 카드 확인",
      registerCardLoading: "확인 중...",
      doneBenefit: "이용권 결제 확인 후 30일 혜택이 활성화됩니다.",
      close: "닫기",
      carrierLabels: {
        KT: "KT",
        SKT: "SKT",
        "LGU+": "LGU+",
        "KT알뜰": "KT알뜰",
        "SKT알뜰": "SKT알뜰",
        "LGU알뜰": "LGU알뜰",
      },
    },
    placeholders: {
      name: "홍길동",
      birthGender: "●",
      phone: "01012345678",
      otp: "인증번호 6자리",
    },
    cardName: "등록 카드",
  },
  en: {
    step: {
      input: "Enter the card for payment",
      auth: "Enter identity details",
      confirm: "Review payment details",
      done: "Payment card confirmed",
    },
    secureTest: "PortOne secure test",
    errors: {
      cardNumber: "Please enter the card number correctly.",
      expiry: "Please enter the expiration date.",
      agreement: "Please agree to the service terms.",
      phone: "Please enter your mobile number.",
      otpSendFailed: "Failed to send the verification code.",
      otpSendFailedShort: "Verification code failed",
      name: "Please enter your name.",
      birth: "Please enter the first 6 digits of your ID number.",
      otp: "Please enter the verification code.",
      registerFailed: "Card registration failed.",
      registerFailedShort: "Card registration failed",
    },
    labels: {
      cardNumber: "Card number",
      expiry: "Expiration",
      agreement: "(Required) Agree to service terms and privacy processing",
      viewTerms: "View terms",
      noCharge: "This test does not make an actual charge",
      next: "Next",
      otpSent: "Verification code sent",
      name: "Name",
      birthNumber: "ID number, first 7 digits",
      carrierPhone: "Carrier · mobile number",
      otpCode: "Verification code",
      sendOtp: "Send code",
      resendOtp: "Resend",
      receiveOtpAgain: "Get the code again",
      confirm: "Confirm",
      productInfo: "Product information",
      productName: "Product",
      passName: "30-day pass",
      paymentUser: "Payer",
      paymentInfo: "Payment information",
      totalAmount: "Total payment",
      selectedPassAmount: "Selected pass amount",
      recurringNote: "This is a one-time payment for the selected Moonlight Pass period. Recurring billing is not enabled.",
      registerCard: "Confirm payment card",
      registerCardLoading: "Checking...",
      doneBenefit: "After payment confirmation, your 30-day benefits will be activated.",
      close: "Close",
      carrierLabels: {
        KT: "KT",
        SKT: "SKT",
        "LGU+": "LGU+",
        "KT알뜰": "KT budget",
        "SKT알뜰": "SKT budget",
        "LGU알뜰": "LGU budget",
      },
    },
    placeholders: {
      name: "Your name",
      birthGender: "●",
      phone: "01012345678",
      otp: "6-digit code",
    },
    cardName: "Registered card",
  },
  ja: {
    step: {
      input: "決済に使うカードを入力してください",
      auth: "本人情報を入力してください",
      confirm: "決済情報を確認してください",
      done: "決済カードの確認が完了しました",
    },
    secureTest: "PortOne セキュアテスト",
    errors: {
      cardNumber: "カード番号を正しく入力してください。",
      expiry: "有効期限を入力してください。",
      agreement: "サービス利用規約に同意してください。",
      phone: "携帯電話番号を入力してください。",
      otpSendFailed: "認証番号の送信に失敗しました。",
      otpSendFailedShort: "認証番号の送信失敗",
      name: "名前を入力してください。",
      birth: "住民登録番号の先頭6桁を入力してください。",
      otp: "認証番号を入力してください。",
      registerFailed: "カード登録に失敗しました。",
      registerFailedShort: "カード登録失敗",
    },
    labels: {
      cardNumber: "カード番号",
      expiry: "有効期限",
      agreement: "（必須）サービス利用規約・個人情報処理への同意",
      viewTerms: "内容を見る",
      noCharge: "実際の決済が発生するテストではありません",
      next: "次へ",
      otpSent: "認証番号を送信しました",
      name: "名前",
      birthNumber: "住民登録番号の先頭7桁",
      carrierPhone: "通信会社・携帯電話番号",
      otpCode: "認証番号",
      sendOtp: "認証番号を送信",
      resendOtp: "再送信",
      receiveOtpAgain: "認証番号を再取得",
      confirm: "確認",
      productInfo: "商品情報",
      productName: "商品名",
      passName: "30日パス",
      paymentUser: "決済者",
      paymentInfo: "決済情報",
      totalAmount: "合計決済金額",
      selectedPassAmount: "選択したパスの金額",
      recurringNote: "この決済は選択期間の月光パスの単発決済で、自動継続決済は設定されません。",
      registerCard: "決済カードを確認",
      registerCardLoading: "確認中...",
      doneBenefit: "決済確認後、30日間の特典が有効になります。",
      close: "閉じる",
      carrierLabels: {
        KT: "KT",
        SKT: "SKT",
        "LGU+": "LGU+",
        "KT알뜰": "KT格安",
        "SKT알뜰": "SKT格安",
        "LGU알뜰": "LGU格安",
      },
    },
    placeholders: {
      name: "山田太郎",
      birthGender: "●",
      phone: "01012345678",
      otp: "6桁の認証番号",
    },
    cardName: "登録カード",
  },
  "zh-CN": {
    step: {
      input: "请输入用于支付的银行卡",
      auth: "请输入本人信息",
      confirm: "请确认支付信息",
      done: "支付卡确认完成",
    },
    secureTest: "PortOne 安全测试",
    errors: {
      cardNumber: "请正确输入银行卡号。",
      expiry: "请输入有效期。",
      agreement: "请同意服务条款。",
      phone: "请输入手机号码。",
      otpSendFailed: "验证码发送失败。",
      otpSendFailedShort: "验证码发送失败",
      name: "请输入姓名。",
      birth: "请输入身份证明号码前6位。",
      otp: "请输入验证码。",
      registerFailed: "银行卡登记失败。",
      registerFailedShort: "银行卡登记失败",
    },
    labels: {
      cardNumber: "银行卡号",
      expiry: "有效期",
      agreement: "（必选）同意服务条款和个人信息处理",
      viewTerms: "查看内容",
      noCharge: "此测试不会产生实际扣款",
      next: "下一步",
      otpSent: "验证码已发送",
      name: "姓名",
      birthNumber: "身份证明号码前7位",
      carrierPhone: "运营商 · 手机号码",
      otpCode: "验证码",
      sendOtp: "发送验证码",
      resendOtp: "重新发送",
      receiveOtpAgain: "重新获取验证码",
      confirm: "确认",
      productInfo: "商品信息",
      productName: "商品名",
      passName: "30天通行证",
      paymentUser: "付款人",
      paymentInfo: "支付信息",
      totalAmount: "支付总额",
      selectedPassAmount: "所选通行证金额",
      recurringNote: "本次为所选月光通行证期限的一次性支付，不会开启自动续费。",
      registerCard: "确认支付卡",
      registerCardLoading: "确认中...",
      doneBenefit: "支付确认后，30天权益将会启用。",
      close: "关闭",
      carrierLabels: {
        KT: "KT",
        SKT: "SKT",
        "LGU+": "LGU+",
        "KT알뜰": "KT经济",
        "SKT알뜰": "SKT经济",
        "LGU알뜰": "LGU经济",
      },
    },
    placeholders: {
      name: "姓名",
      birthGender: "●",
      phone: "01012345678",
      otp: "6位验证码",
    },
    cardName: "已登记银行卡",
  },
  "zh-TW": {
    step: {
      input: "請輸入用於付款的卡片",
      auth: "請輸入本人資訊",
      confirm: "請確認付款資訊",
      done: "付款卡確認完成",
    },
    secureTest: "PortOne 安全測試",
    errors: {
      cardNumber: "請正確輸入卡號。",
      expiry: "請輸入有效期限。",
      agreement: "請同意服務條款。",
      phone: "請輸入手機號碼。",
      otpSendFailed: "驗證碼發送失敗。",
      otpSendFailedShort: "驗證碼發送失敗",
      name: "請輸入姓名。",
      birth: "請輸入身分證明號碼前6位。",
      otp: "請輸入驗證碼。",
      registerFailed: "卡片登錄失敗。",
      registerFailedShort: "卡片登錄失敗",
    },
    labels: {
      cardNumber: "卡號",
      expiry: "有效期限",
      agreement: "（必填）同意服務條款與個人資訊處理",
      viewTerms: "查看內容",
      noCharge: "此測試不會產生實際扣款",
      next: "下一步",
      otpSent: "驗證碼已發送",
      name: "姓名",
      birthNumber: "身分證明號碼前7位",
      carrierPhone: "電信商 · 手機號碼",
      otpCode: "驗證碼",
      sendOtp: "發送驗證碼",
      resendOtp: "重新發送",
      receiveOtpAgain: "重新取得驗證碼",
      confirm: "確認",
      productInfo: "商品資訊",
      productName: "商品名稱",
      passName: "30天通行證",
      paymentUser: "付款人",
      paymentInfo: "付款資訊",
      totalAmount: "付款總額",
      selectedPassAmount: "所選通行證金額",
      recurringNote: "本次為所選月光通行證期間的一次性付款，不會設定自動續費。",
      registerCard: "確認付款卡",
      registerCardLoading: "確認中...",
      doneBenefit: "付款確認後，30天權益將會啟用。",
      close: "關閉",
      carrierLabels: {
        KT: "KT",
        SKT: "SKT",
        "LGU+": "LGU+",
        "KT알뜰": "KT平價",
        "SKT알뜰": "SKT平價",
        "LGU알뜰": "LGU平價",
      },
    },
    placeholders: {
      name: "姓名",
      birthGender: "●",
      phone: "01012345678",
      otp: "6位驗證碼",
    },
    cardName: "已登錄卡片",
  },
  vi: {} as BillingCardCopy,
  hi: {} as BillingCardCopy,
  es: {} as BillingCardCopy,
  fr: {} as BillingCardCopy,
  de: {} as BillingCardCopy,
  nl: {} as BillingCardCopy,
  ms: {} as BillingCardCopy,
};

for (const locale of ["vi", "hi", "es", "fr", "de", "nl", "ms"] as LoadingLocale[]) {
  BILLING_CARD_COPY[locale] = BILLING_CARD_COPY.en;
}

export default function BillingCardModal({ buyerName, buyerPhone = "", onSuccess, onClose, apiBase }: Props) {
  const [step, setStep] = useState<Step>("input");
  const copy = BILLING_CARD_COPY[getCurrentLoadingLocale()] || BILLING_CARD_COPY.ko;
  useBodyScrollLock(true);

  /* ── 카드 정보 입력 */
  const [cardNum1, setCardNum1] = useState("");
  const [cardNum2, setCardNum2] = useState("");
  const [cardNum3, setCardNum3] = useState("");
  const [cardNum4, setCardNum4] = useState("");
  const [expMM, setExpMM] = useState("");
  const [expYY, setExpYY] = useState("");
  const [agreed, setAgreed] = useState(false);

  /* ── 본인 인증 */
  const [authName, setAuthName] = useState(buyerName || "");
  const [birthDate, setBirthDate] = useState("");
  const [birthGender, setBirthGender] = useState("1");
  const [phone, setPhone] = useState(buyerPhone || "");
  const [carrier, setCarrier] = useState("KT");
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(300); // 5분
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  /* ── 처리 상태 */
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredCard, setRegisteredCard] = useState<RegisteredCard | null>(null);

  /* 자동 포커스 핸들러 */
  const inputRef2 = useRef<HTMLInputElement>(null);
  const inputRef3 = useRef<HTMLInputElement>(null);
  const inputRef4 = useRef<HTMLInputElement>(null);

  const formatMask = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

  /* OTP 타이머 시작 */
  const startTimer = () => {
    setOtpTimer(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const formatTimer = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  /* STEP 1 → 2 */
  const handleCardNext = () => {
    const cardFull = [cardNum1, cardNum2, cardNum3, cardNum4].join("").replace(/\D/g, "");
    if (cardFull.length < 15) { setError(copy.errors.cardNumber); return; }
    if (!expMM || !expYY || expMM.length < 2 || expYY.length < 2) { setError(copy.errors.expiry); return; }
    if (!agreed) { setError(copy.errors.agreement); return; }
    setError("");
    setStep("auth");
  };

  /* OTP 발송 */
  const handleSendOtp = useCallback(async () => {
    if (!phone || phone.replace(/\D/g, "").length < 10) { setError(copy.errors.phone); return; }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/payments/billing/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), carrier }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || copy.errors.otpSendFailed); }
      setOtpSent(true);
      startTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.otpSendFailedShort);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, carrier, copy.errors.otpSendFailed, copy.errors.otpSendFailedShort, copy.errors.phone, phone]);

  /* STEP 2 → 3 */
  const handleAuthNext = () => {
    if (!authName.trim()) { setError(copy.errors.name); return; }
    if (birthDate.replace(/\D/g, "").length < 6) { setError(copy.errors.birth); return; }
    if (!otpSent || otp.length < 4) { setError(copy.errors.otp); return; }
    setError("");
    setStep("confirm");
  };

  /* STEP 3: 카드 등록 최종 확인 */
  const handleRegister = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/payments/billing/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cardNumber: [cardNum1, cardNum2, cardNum3, cardNum4].join(""),
          expMonth: expMM,
          expYear: expYY,
          buyerName: authName,
          birthDate,
          phone: phone.replace(/\D/g, ""),
          carrier,
          otp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || copy.errors.registerFailed);
      const card: RegisteredCard = {
        billingKey: data.billingKey || "",
        cardName: data.cardName || copy.cardName,
        cardNumber: data.cardNumber || `**** **** **** ${cardNum4}`,
        registeredAt: new Date().toISOString(),
      };
      setRegisteredCard(card);
      setStep("done");
      onSuccess(card.billingKey, card);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.registerFailedShort);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, authName, birthDate, cardNum1, cardNum2, cardNum3, cardNum4, carrier, copy.cardName, copy.errors.registerFailed, copy.errors.registerFailedShort, expMM, expYY, onSuccess, otp, phone]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-[0_-8px_60px_rgba(0,0,0,0.35)]">
        {/* 결제 스타일 헤더 */}
        <div className="bg-white px-5 pb-6 pt-5 max-h-[90vh] overflow-y-auto">
          <div className="mb-5 flex items-center justify-between gap-3">
            {step !== "input" ? (
              <button type="button" onClick={() => { setError(""); setStep(step === "auth" ? "input" : "auth"); }} className="text-gray-400 hover:text-gray-600">
                ←
              </button>
            ) : <span />}
            <div className="flex-1 text-center">
              <p className="text-[11.5px] text-gray-400 font-semibold">
                {copy.step[step]}
              </p>
              <p className="text-[12px] text-gray-300">{copy.secureTest}</p>
            </div>
            <button type="button" onClick={onClose} disabled={isLoading} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50">×</button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 rounded-[12px] border border-rose-300 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {/* ── STEP 1: 카드 번호 입력 ── */}
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">{copy.labels.cardNumber}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: cardNum1, set: setCardNum1, ref: undefined, next: inputRef2 },
                    { val: cardNum2, set: setCardNum2, ref: inputRef2, next: inputRef3, masked: true },
                    { val: cardNum3, set: setCardNum3, ref: inputRef3, next: inputRef4, masked: true },
                    { val: cardNum4, set: setCardNum4, ref: inputRef4, next: undefined },
                  ].map((field, i) => (
                    <input
                      key={i}
                      ref={field.ref}
                      type={field.masked ? "password" : "tel"}
                      inputMode="numeric"
                      maxLength={4}
                      value={field.val}
                      placeholder="●●●●"
                      onChange={(e) => {
                        const v = formatMask(e.target.value, 4);
                        field.set(v);
                        if (v.length === 4 && field.next?.current) field.next.current.focus();
                      }}
                      className="w-full rounded-[10px] border border-gray-300 bg-gray-50 px-2 py-3 text-center text-[15px] font-bold tracking-widest focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">{copy.labels.expiry}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="MM"
                    value={expMM}
                    onChange={(e) => setExpMM(formatMask(e.target.value, 2))}
                    className="w-20 rounded-[10px] border border-gray-300 bg-gray-50 px-3 py-3 text-center text-[14px] font-bold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <span className="text-gray-400 font-bold">/</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="YY"
                    value={expYY}
                    onChange={(e) => setExpYY(formatMask(e.target.value, 2))}
                    className="w-20 rounded-[10px] border border-gray-300 bg-gray-50 px-3 py-3 text-center text-[14px] font-bold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-[12px] text-gray-600 leading-relaxed">
                  <span className="font-bold text-gray-800">{copy.labels.agreement}</span>
                  <button type="button" className="ml-1 text-amber-600 hover:underline text-[11px]">{copy.labels.viewTerms}</button>
                </span>
              </label>
              <p className="text-[11.5px] text-amber-600 bg-amber-50 px-3 py-2 rounded-[10px]">💡 {copy.labels.noCharge}</p>

              <button
                type="button"
                onClick={handleCardNext}
                className="w-full rounded-[14px] bg-gray-900 py-4 text-[14px] font-black text-white shadow hover:bg-gray-800 active:scale-[0.97] transition-all"
              >
                {copy.labels.next}
              </button>
            </div>
          )}

          {/* ── STEP 2: 본인 인증 ── */}
          {step === "auth" && (
            <div className="space-y-4">
              {otpSent && (
                <div className="flex items-center gap-2 rounded-[12px] bg-emerald-50 border border-emerald-300 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[12.5px] text-emerald-700 font-bold">{copy.labels.otpSent}</span>
                </div>
              )}

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">{copy.labels.name}</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder={copy.placeholders.name}
                  className="w-full rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-semibold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">{copy.labels.birthNumber}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={birthDate}
                    onChange={(e) => setBirthDate(formatMask(e.target.value, 6))}
                    placeholder="960410"
                    className="flex-1 rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-bold tracking-widest focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={birthGender}
                    onChange={(e) => setBirthGender(formatMask(e.target.value, 1))}
                    placeholder={copy.placeholders.birthGender}
                    className="w-12 rounded-[10px] border border-gray-300 bg-gray-50 px-3 py-3 text-center text-[14px] font-bold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <span className="text-gray-300 font-bold text-lg">● ● ● ● ● ●</span>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">{copy.labels.carrierPhone}</label>
                <div className="flex gap-2">
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-24 rounded-[10px] border border-gray-300 bg-gray-50 px-2 py-3 text-[13px] font-bold focus:border-amber-400 focus:outline-none"
                  >
                    {["KT", "SKT", "LGU+", "KT알뜰", "SKT알뜰", "LGU알뜰"].map((c) => (
                      <option key={c} value={c}>{copy.labels.carrierLabels[c] || c}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder={copy.placeholders.phone}
                    className="flex-1 rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-semibold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">{copy.labels.otpCode}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(formatMask(e.target.value, 6))}
                      placeholder={copy.placeholders.otp}
                      className="w-full rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-bold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    {otpSent && otpTimer > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-amber-600">
                        {formatTimer(otpTimer)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="rounded-[10px] bg-gray-800 px-4 py-3 text-[12.5px] font-bold text-white hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {otpSent ? copy.labels.resendOtp : copy.labels.sendOtp}
                  </button>
                </div>
                <button type="button" onClick={() => {}} className="mt-1.5 text-[11.5px] text-amber-600 hover:underline">{copy.labels.receiveOtpAgain}</button>
              </div>

              <button
                type="button"
                onClick={handleAuthNext}
                disabled={isLoading}
                className="w-full rounded-[14px] bg-gray-900 py-4 text-[14px] font-black text-white shadow hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {copy.labels.confirm}
              </button>
            </div>
          )}

          {/* ── STEP 3: 결제 정보 확인 ── */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-[16px] border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">{copy.labels.productInfo}</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{copy.labels.productName}</span>
                    <span className="font-semibold text-gray-800">{copy.labels.passName}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{copy.labels.paymentUser}</span>
                    <span className="font-semibold text-gray-800">{authName}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">{copy.labels.paymentInfo}</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{copy.labels.cardNumber}</span>
                    <span className="font-semibold text-gray-800">
                      {cardNum1} {cardNum2.replace(/./g, "●")} {cardNum3.replace(/./g, "●")} {cardNum4}
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{copy.labels.expiry}</span>
                    <span className="font-semibold text-gray-800">{expMM}/{expYY}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="text-[13px] text-gray-500">{copy.labels.totalAmount}</span>
                    <span className="text-[15px] font-black text-amber-700">{copy.labels.selectedPassAmount}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] bg-sky-50 border border-sky-200 px-4 py-3">
                <p className="text-[11.5px] text-sky-700 leading-relaxed">
                  {copy.labels.recurringNote}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full rounded-[14px] bg-amber-500 py-4 text-[14px] font-black text-white shadow-[0_6px_20px_rgba(180,130,20,0.4)] hover:bg-amber-600 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {isLoading ? copy.labels.registerCardLoading : copy.labels.registerCard}
              </button>
            </div>
          )}

          {/* ── STEP 4: 완료 ── */}
          {step === "done" && registeredCard && (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="text-5xl">✅</span>
                <p className="text-[17px] font-black text-gray-800">{copy.step.done}</p>
                <p className="text-[13px] text-gray-500">{registeredCard.cardName} · {registeredCard.cardNumber}</p>
              </div>
              <div className="rounded-[14px] bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-[12px] text-emerald-700">{copy.labels.doneBenefit}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-[14px] bg-gray-900 py-4 text-[14px] font-black text-white hover:bg-gray-800 transition-all"
              >
                {copy.labels.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
