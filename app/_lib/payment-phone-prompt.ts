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
    const title = document.createElement("h2");
    const desc = document.createElement("p");
    const input = document.createElement("input");
    const error = document.createElement("p");
    const notice = document.createElement("p");
    const disclosure = document.createElement("ul");
    const consentLabel = document.createElement("label");
    const consentInput = document.createElement("input");
    const consentText = document.createElement("span");
    const actions = document.createElement("div");
    const cancelButton = document.createElement("button");
    const submitButton = document.createElement("button");

    const close = (value: string) => {
      if (settled) return;
      settled = true;
      input.value = "";
      overlay.remove();
      resolve(value);
    };

    const setBusy = (isBusy: boolean) => {
      input.disabled = isBusy;
      consentInput.disabled = isBusy;
      cancelButton.disabled = isBusy;
      submitButton.disabled = isBusy;
      submitButton.textContent = isBusy ? "저장 중..." : "저장하고 결제 계속하기";
    };

    overlay.setAttribute("role", "presentation");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,13,31,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);";
    card.style.cssText = "width:min(400px,100%);border:1px solid rgba(255,255,255,.22);border-radius:18px;background:linear-gradient(145deg,rgba(20,25,48,.98),rgba(45,31,82,.98));box-shadow:0 24px 80px rgba(0,0,0,.46);padding:22px;color:#fff;font-family:inherit;";
    title.style.cssText = "margin:0 0 10px;font-size:19px;font-weight:800;";
    desc.style.cssText = "margin:0 0 16px;color:rgba(238,242,255,.78);font-size:14px;line-height:1.6;";
    input.style.cssText = "width:100%;height:48px;box-sizing:border-box;border-radius:12px;border:1px solid rgba(196,181,253,.45);background:rgba(15,23,42,.78);color:#fff;font-size:16px;padding:0 14px;outline:none;";
    error.style.cssText = "min-height:20px;margin:8px 0 0;color:#fecdd3;font-size:13px;line-height:1.45;";
    notice.style.cssText = "margin:8px 0 0;color:rgba(221,214,254,.78);font-size:12px;line-height:1.45;";
    disclosure.style.cssText = "margin:10px 0 0;padding:10px 12px;list-style:none;border:1px solid rgba(196,181,253,.28);border-radius:12px;background:rgba(10,8,24,.55);color:rgba(221,214,254,.86);font-size:12px;line-height:1.55;";
    consentLabel.style.cssText = "display:flex;align-items:flex-start;gap:10px;margin-top:10px;min-height:44px;cursor:pointer;color:#eef2ff;font-size:13px;line-height:1.5;";
    consentInput.style.cssText = "flex:0 0 auto;width:20px;height:20px;margin-top:2px;accent-color:#8f6ccc;";
    actions.style.cssText = "display:flex;gap:10px;margin-top:18px;";
    cancelButton.style.cssText = "flex:0 0 auto;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#e5e7eb;padding:0 16px;font-weight:700;";
    submitButton.style.cssText = "flex:1;min-height:44px;border-radius:12px;border:0;background:linear-gradient(135deg,#f59e0b,#fb7185);color:#111827;padding:0 16px;font-weight:900;";

    title.textContent = "단건결제를 위해 휴대폰 번호가 필요해요";
    desc.textContent = "KG이니시스 결제 진행에 필요한 정보입니다. 최초 1회만 입력하면 다음 결제부터는 바로 결제창이 열립니다.";
    input.type = "tel";
    input.inputMode = "tel";
    input.autocomplete = "tel";
    input.placeholder = "01012345678";
    notice.textContent = "입력한 번호는 결제 진행 목적으로만 사용되며 서버에 암호화해 저장됩니다.";
    for (const line of PAYMENT_PHONE_CONSENT_LINES) {
      const item = document.createElement("li");
      item.textContent = line;
      disclosure.appendChild(item);
    }
    consentInput.type = "checkbox";
    consentInput.id = "cd-payment-phone-consent";
    consentText.textContent = PAYMENT_PHONE_CONSENT_LABEL;
    consentLabel.htmlFor = consentInput.id;
    consentLabel.appendChild(consentInput);
    consentLabel.appendChild(consentText);
    consentInput.addEventListener("change", () => {
      if (consentInput.checked && error.textContent === PAYMENT_PHONE_CONSENT_REQUIRED) error.textContent = "";
    });
    cancelButton.type = "button";
    cancelButton.textContent = "취소";
    submitButton.type = "submit";
    submitButton.textContent = "저장하고 결제 계속하기";

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

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(input);
    card.appendChild(error);
    card.appendChild(notice);
    card.appendChild(disclosure);
    card.appendChild(consentLabel);
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    input.focus();
  });
}
