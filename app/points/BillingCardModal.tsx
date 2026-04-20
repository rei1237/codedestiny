"use client";

/**
 * BillingCardModal.tsx
 * 정기결제(자동결제)용 카드 등록 모달
 * 이미지 참조: 토스페이먼츠 카드 번호 입력 → 본인인증 → 결제 정보 확인
 */

import { useCallback, useRef, useState } from "react";

type Props = {
  buyerName: string;
  buyerPhone?: string;
  onSuccess: (billingKey: string, cardInfo: RegisteredCard) => void;
  onClose: () => void;
  apiBase: string;
  token: string;
};

export type RegisteredCard = {
  billingKey: string;
  cardName: string;
  cardNumber: string; // 마스킹: **** **** **** 1234
  registeredAt: string;
};

type Step = "input" | "auth" | "confirm" | "done";

export default function BillingCardModal({ buyerName, buyerPhone = "", onSuccess, onClose, apiBase, token }: Props) {
  const [step, setStep] = useState<Step>("input");

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
    if (cardFull.length < 15) { setError("카드 번호를 정확히 입력해 주세요."); return; }
    if (!expMM || !expYY || expMM.length < 2 || expYY.length < 2) { setError("유효기간을 입력해 주세요."); return; }
    if (!agreed) { setError("서비스 이용 약관에 동의해 주세요."); return; }
    setError("");
    setStep("auth");
  };

  /* OTP 발송 */
  const handleSendOtp = useCallback(async () => {
    if (!phone || phone.replace(/\D/g, "").length < 10) { setError("휴대폰 번호를 입력해 주세요."); return; }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/payments/billing/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), carrier }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || "인증번호 발송에 실패했습니다."); }
      setOtpSent(true);
      startTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증번호 발송 실패");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, carrier, phone, token]);

  /* STEP 2 → 3 */
  const handleAuthNext = () => {
    if (!authName.trim()) { setError("이름을 입력해 주세요."); return; }
    if (birthDate.replace(/\D/g, "").length < 6) { setError("주민등록번호 앞 6자리를 입력해 주세요."); return; }
    if (!otpSent || otp.length < 4) { setError("인증번호를 입력해 주세요."); return; }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      if (!res.ok) throw new Error(data.message || "카드 등록에 실패했습니다.");
      const card: RegisteredCard = {
        billingKey: data.billingKey || "",
        cardName: data.cardName || "등록 카드",
        cardNumber: data.cardNumber || `**** **** **** ${cardNum4}`,
        registeredAt: new Date().toISOString(),
      };
      setRegisteredCard(card);
      setStep("done");
      onSuccess(card.billingKey, card);
    } catch (e) {
      setError(e instanceof Error ? e.message : "카드 등록 실패");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, authName, birthDate, cardNum1, cardNum2, cardNum3, cardNum4, carrier, expMM, expYY, onSuccess, otp, phone, token]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-[0_-8px_60px_rgba(0,0,0,0.35)]">
        {/* toss payments 스타일 헤더 */}
        <div className="bg-white px-5 pb-6 pt-5 max-h-[90vh] overflow-y-auto">
          <div className="mb-5 flex items-center justify-between gap-3">
            {step !== "input" ? (
              <button type="button" onClick={() => { setError(""); setStep(step === "auth" ? "input" : "auth"); }} className="text-gray-400 hover:text-gray-600">
                ←
              </button>
            ) : <span />}
            <div className="flex-1 text-center">
              <p className="text-[11.5px] text-gray-400 font-semibold">
                {step === "input" ? "등록할 카드를 입력해주세요" : step === "auth" ? "본인 정보를 입력해주세요" : step === "confirm" ? "결제 정보를 확인해주세요" : "카드 등록 완료"}
              </p>
              <p className="text-[12px] text-gray-300">아임포트테스트</p>
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
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">카드번호</label>
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
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">유효기간</label>
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
                  <span className="font-bold text-gray-800">(필수) 서비스 이용 약관, 개인정보 처리 동의</span>
                  <button type="button" className="ml-1 text-amber-600 hover:underline text-[11px]">내용 보기</button>
                </span>
              </label>
              <p className="text-[11.5px] text-amber-600 bg-amber-50 px-3 py-2 rounded-[10px]">💡 실제 결제가 발생하는 테스트가 아닙니다</p>

              <button
                type="button"
                onClick={handleCardNext}
                className="w-full rounded-[14px] bg-gray-900 py-4 text-[14px] font-black text-white shadow hover:bg-gray-800 active:scale-[0.97] transition-all"
              >
                다음
              </button>
            </div>
          )}

          {/* ── STEP 2: 본인 인증 ── */}
          {step === "auth" && (
            <div className="space-y-4">
              {otpSent && (
                <div className="flex items-center gap-2 rounded-[12px] bg-emerald-50 border border-emerald-300 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[12.5px] text-emerald-700 font-bold">인증번호를 보내요.</span>
                </div>
              )}

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">이름</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-semibold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">주민등록번호 앞 7자리</label>
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
                    placeholder="●"
                    className="w-12 rounded-[10px] border border-gray-300 bg-gray-50 px-3 py-3 text-center text-[14px] font-bold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <span className="text-gray-300 font-bold text-lg">● ● ● ● ● ●</span>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">통신사 · 휴대폰번호</label>
                <div className="flex gap-2">
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-24 rounded-[10px] border border-gray-300 bg-gray-50 px-2 py-3 text-[13px] font-bold focus:border-amber-400 focus:outline-none"
                  >
                    {["KT", "SKT", "LGU+", "KT알뜰", "SKT알뜰", "LGU알뜰"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01012345678"
                    className="flex-1 rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-semibold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-gray-700 mb-1.5">인증번호</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(formatMask(e.target.value, 6))}
                      placeholder="인증번호 6자리"
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
                    {otpSent ? "재발송" : "인증번호 발송"}
                  </button>
                </div>
                <button type="button" onClick={() => {}} className="mt-1.5 text-[11.5px] text-amber-600 hover:underline">인증번호 다시 받기</button>
              </div>

              <button
                type="button"
                onClick={handleAuthNext}
                disabled={isLoading}
                className="w-full rounded-[14px] bg-gray-900 py-4 text-[14px] font-black text-white shadow hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                확인
              </button>
            </div>
          )}

          {/* ── STEP 3: 결제 정보 확인 ── */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-[16px] border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">상품정보</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">상품명</span>
                    <span className="font-semibold text-gray-800">정기결제 카드 등록</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">결제대상</span>
                    <span className="font-semibold text-gray-800">{authName}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">결제정보</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">카드번호</span>
                    <span className="font-semibold text-gray-800">
                      {cardNum1} {cardNum2.replace(/./g, "●")} {cardNum3.replace(/./g, "●")} {cardNum4}
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">유효기간</span>
                    <span className="font-semibold text-gray-800">{expMM}/{expYY}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="text-[13px] text-gray-500">총 결제금액</span>
                    <span className="text-[15px] font-black text-amber-700">카드 등록만 (결제 없음)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] bg-sky-50 border border-sky-200 px-4 py-3">
                <p className="text-[11.5px] text-sky-700 leading-relaxed">
                  ℹ️ 구독 카드 등록 시 즉시 결제가 발생하지 않습니다. 등록된 카드는 향후 구독 갱신 시 사용됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full rounded-[14px] bg-amber-500 py-4 text-[14px] font-black text-white shadow-[0_6px_20px_rgba(180,130,20,0.4)] hover:bg-amber-600 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {isLoading ? "등록 중..." : "카드 등록하기"}
              </button>
            </div>
          )}

          {/* ── STEP 4: 완료 ── */}
          {step === "done" && registeredCard && (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="text-5xl">✅</span>
                <p className="text-[17px] font-black text-gray-800">카드 등록 완료!</p>
                <p className="text-[13px] text-gray-500">{registeredCard.cardName} · {registeredCard.cardNumber}</p>
              </div>
              <div className="rounded-[14px] bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-[12px] text-emerald-700">이 카드로 구독 자동 갱신이 설정되었습니다.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-[14px] bg-gray-900 py-4 text-[14px] font-black text-white hover:bg-gray-800 transition-all"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
