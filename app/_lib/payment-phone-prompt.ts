/**
 * 단건결제(PortOne/KG이니시스)용 구매자 휴대폰 번호 입력 UI와 실패 문구 분류.
 *
 * 기존 구현은 `window.prompt`를 썼는데, 카카오·인스타·네이버 등 인앱 웹뷰가 prompt 를 억제하고
 * 즉시 null 을 반환한다 — 번호를 넣을 방법이 없는 채로 throw 되어 결제창이 아예 열리지 않았다.
 * 정적 셸(`index.html`)의 `_cdPromptDirectCheckoutPhoneNumber` 와 같은 인페이지 모달을 쓴다.
 *
 * 저장 자체는 호출자가 넘긴 `onSave` 가 수행한다 — `/points` 는 일시 503 완충을,
 * `/me` 는 단순 저장을 쓰는 등 화면별 재시도 정책이 다르므로 여기서 통일하지 않는다.
 */

import { formatKoreanPhoneInput } from "./korean-phone";

interface PaymentPhoneFailurePayload {
  code?: string;
  message?: string;
}

/**
 * 서버 원문을 그대로 노출하지 않는다. 교차출처 승격으로 생긴 403 `csrf_origin_mismatch` 는
 * 사용자에게 "Invalid auth request origin." 으로 보였고, 손쓸 방법이 없는 문구였다.
 */
export function describePaymentPhoneFailure(status: number, payload?: PaymentPhoneFailurePayload | null): string {
  const code = String(payload?.code || "").trim().toLowerCase();
  if (!Number.isFinite(status) || status === 0) return "네트워크가 불안정해 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
  if (code === "csrf_origin_mismatch") return "일시적인 문제로 저장하지 못했어요. 다시 시도해 주세요.";
  if (status === 401) return "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.";
  if (status === 400) return "휴대폰 번호를 정확히 입력해 주세요.";
  if (code === "duplicate_phone") return "이미 다른 계정에서 사용 중인 번호예요. 다른 번호를 입력하시거나 admin@code-destiny.com 으로 문의해 주세요.";
  if (status >= 500) return "서버가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.";
  return "휴대폰 번호 저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

/**
 * 결제용 휴대폰 번호 — 선택 동의 고지 (개인정보 보호법 제15조 제2항).
 *
 * 🔴 이 4줄은 셸(`index.html` `_cdPromptDirectCheckoutPhoneNumber`)과
 * 독립 폴백(`js/destiny-profile.js` `_dpPromptPaymentPhoneNumber`)에 **글자 그대로 같아야 한다.**
 * 렌더러가 3벌이라 한 곳만 고치면 사용자마다 다른 고지를 받게 된다
 * (결제수단 선택창과 같은 구조 — `npm run verify:payment-phone-consent` 가 동일성을 강제한다).
 *
 * 🔴 거부 시 불이익을 사실대로 적는다. 가입 화면과 달리 여기서는 거부하면 **카드 결제가 통째로
 * 막힌다** — 이니시스가 구매자 번호를 요구하는데, 이용권도 카드로 사는 상품이라 단건결제와
 * 똑같이 걸린다(이 모달은 이용권 결제 흐름에서도 뜬다 — PointsClient.tsx 의
 * ensurePaymentPhoneNumber 호출). 남는 수단은 이벤트로 지급된 월정석뿐이므로 그렇게 적는다.
 */
export const PAYMENT_PHONE_CONSENT_LINES = [
  "수집 항목 · 휴대폰 번호",
  "이용 목적 · 결제 진행 및 구매자 확인 (결제대행사 포트원·KG이니시스에 전달)",
  "보유·이용 기간 · 회원 탈퇴 시까지 (법령상 보존 의무가 있는 거래기록은 그 기간)",
  "거부 권리 · 동의하지 않아도 됩니다. 다만 이용권 구매를 포함한 모든 카드 결제에 번호가 필요해 진행할 수 없고, 보유하신 월정석으로만 이용하실 수 있어요.",
];

export const PAYMENT_PHONE_CONSENT_LABEL = "결제 진행 목적의 휴대폰 번호 수집·이용에 동의합니다. (필수)";
export const PAYMENT_PHONE_CONSENT_REQUIRED = "휴대폰 번호 수집·이용에 동의해 주셔야 결제를 진행할 수 있어요.";

interface PromptPaymentPhoneOptions {
  /** 입력된 번호를 정규화해 반환하는 함수(빈 문자열이면 실패로 본다). */
  normalize: (value: string) => string;
  /** 서버 저장. 실패 시 사용자에게 보여줄 메시지를 담아 throw 해야 한다. */
  onSave: (phoneNumber: string, consented: boolean) => Promise<string>;
}

/** 저장까지 성공한 번호를 반환한다. 사용자가 취소하면 빈 문자열. */
export function promptPaymentPhoneNumber(options: PromptPaymentPhoneOptions): Promise<string> {
  if (typeof document === "undefined") return Promise.resolve("");

  return new Promise<string>((resolve) => {
    let settled = false;
    const overlay = document.createElement("div");
    const card = document.createElement("form");
    const rule = document.createElement("div");
    const title = document.createElement("h2");
    const desc = document.createElement("p");
    const fieldLabel = document.createElement("label");
    const input = document.createElement("input");
    const error = document.createElement("p");
    const notice = document.createElement("p");
    const disclosure = document.createElement("ul");
    const consentLabel = document.createElement("label");
    const consentInput = document.createElement("input");
    const consentText = document.createElement("span");
    const policy = document.createElement("p");
    const policyLink = document.createElement("a");
    const actions = document.createElement("div");
    const cancelButton = document.createElement("button");
    const submitButton = document.createElement("button");

    const onOverlayKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (input.disabled) return;
      event.preventDefault();
      close("");
    };

    const close = (value: string) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onOverlayKeydown, true);
      input.value = "";
      overlay.remove();
      resolve(value);
    };

    const setBusy = (isBusy: boolean) => {
      input.disabled = isBusy;
      consentInput.disabled = isBusy;
      cancelButton.disabled = isBusy;
      submitButton.disabled = isBusy;
      submitButton.style.opacity = isBusy ? ".62" : "1";
      submitButton.textContent = isBusy ? "저장 중..." : "저장하고 결제 계속하기";
    };

    // 동의 여부에 따라 카드 테두리를 바꿔 '무엇을 더 해야 하는지'를 색으로도 알린다.
    const syncConsentAffordance = () => {
      consentLabel.style.borderColor = consentInput.checked ? "rgba(232,213,163,.55)" : "rgba(196,181,253,.22)";
      consentLabel.style.background = consentInput.checked ? "rgba(38,29,74,.62)" : "rgba(16,12,38,.55)";
    };

    // 🔴 스타일·구조는 셸 정본(index.html _cdPromptDirectCheckoutPhoneNumber)과 같은 규격이다.
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "cd-payment-phone-title");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(130% 100% at 50% 0%,rgba(36,26,74,.78),rgba(6,4,16,.92));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);";
    card.style.cssText = "width:min(420px,100%);max-height:calc(100vh - 36px);overflow-y:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box;border:1px solid rgba(232,213,163,.20);border-radius:22px;background:linear-gradient(168deg,#181334,#100c26 55%,#0b0819);box-shadow:0 30px 88px rgba(3,2,12,.66);padding:24px 22px 20px;color:#f6f3ff;font-family:inherit;";
    rule.style.cssText = "width:34px;height:2px;margin:0 0 14px;border-radius:2px;background:linear-gradient(90deg,#e8d5a3,rgba(196,181,253,.35));";
    title.style.cssText = "margin:0 0 8px;font-size:19px;font-weight:800;line-height:1.4;letter-spacing:-.01em;color:#f8f6ff;";
    desc.style.cssText = "margin:0 0 18px;color:rgba(211,205,236,.8);font-size:13.5px;line-height:1.68;";
    fieldLabel.style.cssText = "display:block;margin:0 0 8px;color:rgba(232,213,163,.9);font-size:12px;font-weight:700;";
    input.style.cssText = "width:100%;height:52px;box-sizing:border-box;border-radius:14px;border:1px solid rgba(196,181,253,.30);background:rgba(8,6,20,.7);color:#f8f6ff;font-size:16px;font-weight:600;letter-spacing:.02em;padding:0 15px;outline:none;transition:border-color .16s ease,box-shadow .16s ease;";
    error.style.cssText = "min-height:18px;margin:9px 0 0;color:#f7b7c4;font-size:12.5px;line-height:1.5;";
    notice.style.cssText = "margin:9px 0 0;color:rgba(198,190,228,.72);font-size:11.5px;line-height:1.55;";
    disclosure.style.cssText = "margin:12px 0 0;padding:12px 14px;list-style:none;border:1px solid rgba(196,181,253,.20);border-radius:14px;background:rgba(6,4,16,.5);color:rgba(210,203,238,.85);font-size:11.5px;line-height:1.6;";
    consentLabel.style.cssText = "display:flex;align-items:flex-start;gap:11px;margin-top:12px;padding:11px 12px;box-sizing:border-box;min-height:44px;border:1px solid rgba(196,181,253,.22);border-radius:14px;background:rgba(16,12,38,.55);cursor:pointer;color:#eee9ff;font-size:12.5px;line-height:1.6;transition:border-color .16s ease,background-color .16s ease;";
    consentInput.style.cssText = "flex:0 0 auto;width:19px;height:19px;margin:1px 0 0;accent-color:#c4b5fd;cursor:pointer;";
    policy.style.cssText = "margin:9px 0 0;font-size:11.5px;line-height:1.5;";
    policyLink.style.cssText = "color:rgba(232,213,163,.9);text-decoration:underline;text-underline-offset:3px;";
    actions.style.cssText = "display:flex;gap:10px;margin-top:18px;";
    cancelButton.style.cssText = "flex:0 0 auto;min-height:48px;border-radius:14px;border:1px solid rgba(196,181,253,.24);background:rgba(255,255,255,.04);color:#cfc7ea;padding:0 18px;font-size:14px;font-weight:700;cursor:pointer;";
    submitButton.style.cssText = "flex:1;min-height:48px;border-radius:14px;border:0;background:linear-gradient(135deg,#f0dcab,#d9bd7c);color:#231a3a;padding:0 16px;font-size:14.5px;font-weight:800;letter-spacing:-.01em;cursor:pointer;box-shadow:0 10px 26px rgba(217,189,124,.24);";

    title.id = "cd-payment-phone-title";
    title.textContent = "단건결제를 위해 휴대폰 번호가 필요해요";
    desc.textContent = "KG이니시스 결제 진행에 필요한 정보입니다. 최초 1회만 입력하면 다음 결제부터는 바로 결제창이 열립니다.";
    input.id = "cd-payment-phone-input";
    input.type = "tel";
    input.inputMode = "tel";
    input.autocomplete = "tel";
    input.placeholder = "010-1234-5678";
    input.setAttribute("aria-describedby", "cd-payment-phone-notice");
    fieldLabel.htmlFor = input.id;
    fieldLabel.textContent = "휴대폰 번호";
    notice.id = "cd-payment-phone-notice";
    notice.textContent = "입력한 번호는 결제 진행 목적으로만 사용되며 서버에 암호화해 저장됩니다.";
    PAYMENT_PHONE_CONSENT_LINES.forEach((line, lineIndex) => {
      const item = document.createElement("li");
      item.textContent = line;
      if (lineIndex > 0) item.style.cssText = "margin-top:6px;padding-top:6px;border-top:1px solid rgba(196,181,253,.12);";
      disclosure.appendChild(item);
    });
    consentInput.type = "checkbox";
    consentInput.id = "cd-payment-phone-consent";
    consentText.textContent = PAYMENT_PHONE_CONSENT_LABEL;
    consentLabel.htmlFor = consentInput.id;
    consentLabel.appendChild(consentInput);
    consentLabel.appendChild(consentText);
    consentInput.addEventListener("change", () => {
      syncConsentAffordance();
      if (consentInput.checked && error.textContent === PAYMENT_PHONE_CONSENT_REQUIRED) error.textContent = "";
    });
    policyLink.href = "/privacy";
    policyLink.target = "_blank";
    policyLink.rel = "noopener";
    policyLink.textContent = "개인정보처리방침 전문";
    policy.appendChild(policyLink);
    cancelButton.type = "button";
    cancelButton.textContent = "취소";
    submitButton.type = "submit";
    submitButton.textContent = "저장하고 결제 계속하기";

    // 인라인 스타일이라 :focus 를 쓸 수 없다 — 포커스 링을 이벤트로 켠다(키보드 사용자에게 필요).
    input.addEventListener("focus", () => {
      input.style.borderColor = "rgba(232,213,163,.7)";
      input.style.boxShadow = "0 0 0 3px rgba(196,181,253,.18)";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "rgba(196,181,253,.30)";
      input.style.boxShadow = "none";
    });
    // 입력 즉시 010-1234-5678 로 정돈한다. 저장 직전 정규화가 하이픈을 다시 벗긴다.
    input.addEventListener("input", () => {
      const formatted = formatKoreanPhoneInput(input.value);
      if (formatted !== input.value) input.value = formatted;
    });
    cancelButton.addEventListener("click", () => close(""));
    card.addEventListener("submit", (event) => {
      event.preventDefault();
      const normalized = options.normalize(input.value);
      if (!normalized) {
        error.textContent = "휴대폰 번호를 정확히 입력해 주세요.";
        input.focus();
        return;
      }
      // 🔴 동의 없이는 저장하지 않는다. 이 검사가 사라지면 고지만 있고 동의는 없는 상태가 된다.
      if (!consentInput.checked) {
        error.textContent = PAYMENT_PHONE_CONSENT_REQUIRED;
        consentInput.focus();
        return;
      }
      setBusy(true);
      error.textContent = "";
      options.onSave(normalized, true)
        .then((saved) => close(options.normalize(saved) || normalized))
        .catch((saveError: unknown) => {
          setBusy(false);
          const message = saveError instanceof Error ? saveError.message : "";
          error.textContent = message || "휴대폰 번호 저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
          input.focus();
        });
    });

    card.appendChild(rule);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(fieldLabel);
    card.appendChild(input);
    card.appendChild(error);
    card.appendChild(notice);
    card.appendChild(disclosure);
    card.appendChild(consentLabel);
    card.appendChild(policy);
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    card.appendChild(actions);
    overlay.appendChild(card);
    syncConsentAffordance();
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onOverlayKeydown, true);
    // 진입 모션은 Web Animations 로만 준다(인라인 스타일이라 @keyframes 를 쓸 수 없다).
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && typeof card.animate === "function") {
      overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
      card.animate(
        [{ opacity: 0, transform: "translateY(12px) scale(.985)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: "cubic-bezier(.2,.8,.25,1)" },
      );
    }
    input.focus();
  });
}
