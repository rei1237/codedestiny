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

interface PromptPaymentPhoneOptions {
  /** 입력된 번호를 정규화해 반환하는 함수(빈 문자열이면 실패로 본다). */
  normalize: (value: string) => string;
  /** 서버 저장. 실패 시 사용자에게 보여줄 메시지를 담아 throw 해야 한다. */
  onSave: (phoneNumber: string) => Promise<string>;
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
      setBusy(true);
      error.textContent = "";
      options.onSave(normalized)
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
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    input.focus();
  });
}
