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

/**
 * 소셜 계정에서 번호를 가져오는 가속 버튼의 문구.
 *
 * 🔴 위 고지와 같은 이유로 렌더러 3벌에 **글자 그대로 같아야 한다** —
 * npm run verify:payment-phone-consent 가 동일성을 강제한다.
 *
 * 이 버튼은 **가속기일 뿐이다.** 눌러도 안 되면(팝업 차단·거부·공급자 오류) 아래 직접 입력이
 * 항상 그대로 남아 있다. 그래서 실패 문구가 전부 "아래에 직접 입력해 주세요" 로 끝난다.
 */
export const PAYMENT_PHONE_SOCIAL_CTA_KAKAO = "카카오에서 번호 가져오기";
export const PAYMENT_PHONE_SOCIAL_CTA_NAVER = "네이버에서 번호 가져오기";
export const PAYMENT_PHONE_SOCIAL_BLOCKED = "팝업이 차단됐어요. 아래에 직접 입력해 주세요.";
export const PAYMENT_PHONE_SOCIAL_FAILED = "번호를 가져오지 못했어요. 아래에 직접 입력해 주세요.";
/** 공급자에게서 번호를 가져오는 경로일 때 제목 아래 설명. 직접 입력 안내를 대신한다. */
export const PAYMENT_PHONE_SOCIAL_DESC = "소셜 계정에 등록된 번호를 가져옵니다. 동의 창에서 번호 제공에 동의하면 결제가 이어집니다.";

/** 팝업을 열어 둔 채 사용자가 손을 놓았을 때 버튼을 되살리기까지의 시간. */
const SOCIAL_CONSENT_TIMEOUT_MS = 120000;

export function paymentPhoneSocialCtaLabel(provider: string): string {
  if (provider === "kakao") return PAYMENT_PHONE_SOCIAL_CTA_KAKAO;
  if (provider === "naver") return PAYMENT_PHONE_SOCIAL_CTA_NAVER;
  return "";
}

/**
 * 소셜 추가 동의(가속 버튼) 배관. 넘기지 않으면 버튼이 아예 없다 — 직접 입력만 남는다.
 *
 * 🔴 공급자 목록은 **서버가 판정한다**(GET /api/me/payment-phone 의 socialPhoneProviders).
 * 계정에 그 소셜이 연결돼 있고 그 공급자의 동의항목이 승인돼 scope 가 켜져 있을 때만 온다.
 * 프론트에서 추측하면 승인 전에 버튼이 뜨고, 누르면 카카오가 KOE205 로 거절하는 창을 보게 된다.
 */
interface PaymentPhoneSocialConsent {
  /** 지금 번호를 가져올 수 있는 공급자. 조회에 실패하면 빈 배열을 돌려준다(버튼이 안 뜬다). */
  listProviders: () => Promise<string[]>;
  /** 추가 동의 팝업으로 열 절대/상대 URL. */
  startUrl: (provider: string) => string;
  /** 팝업이 성공을 알린 뒤 서버에서 저장된 번호를 다시 읽는다. */
  readSavedPhoneNumber: () => Promise<string>;
}

interface PromptPaymentPhoneOptions {
  /** 입력된 번호를 정규화해 반환하는 함수(빈 문자열이면 실패로 본다). */
  normalize: (value: string) => string;
  /** 서버 저장. 실패 시 사용자에게 보여줄 메시지를 담아 throw 해야 한다. */
  onSave: (phoneNumber: string, consented: boolean) => Promise<string>;
  /** 있으면 "카카오에서 번호 가져오기" 가속 버튼이 붙는다. */
  socialConsent?: PaymentPhoneSocialConsent | null;
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
    const socialButton = document.createElement("button");
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

    // 🔴 공급자가 번호를 줄 수 있으면 **직접 입력을 보여주지 않는다**(2026-08-25). 카카오·네이버는
    // 전화번호가 선택 동의라 거부한 채로 가입이 끝날 수 있고, 그 사용자는 결제할 때 자기 소셜에서
    // 동의해야 한다. 구글은 애초에 번호를 주지 않으므로 이 묶음이 그대로 보인다.
    // 🔴 이 함수를 지우고 항상 보이게 되돌리면, 소셜 동의 경로가 "둘 중 아무거나" 로 돌아간다.
    const manualEntryNodes = () => [fieldLabel, input, notice, consentLabel, submitButton];
    const setManualEntryVisible = (visible: boolean) => {
      for (const node of manualEntryNodes()) node.style.display = visible ? "" : "none";
    };

    const setBusy = (isBusy: boolean) => {
      input.disabled = isBusy;
      consentInput.disabled = isBusy;
      cancelButton.disabled = isBusy;
      submitButton.disabled = isBusy;
      socialButton.disabled = isBusy;
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
    // 보조 수단이라 제출 버튼보다 낮은 위계로 둔다(테두리만, 채우지 않음).
    socialButton.style.cssText = "display:none;width:100%;min-height:46px;margin:2px 0 0;box-sizing:border-box;"
      + "border-radius:14px;border:1px solid rgba(232,213,163,.42);background:rgba(232,213,163,.08);color:#f0dcab;"
      + "padding:0 14px;font-size:13.5px;font-weight:700;letter-spacing:-.01em;cursor:pointer;";
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
    const manualDesc = "KG이니시스 결제 진행에 필요한 정보입니다. 최초 1회만 입력하면 다음 결제부터는 바로 결제창이 열립니다.";
    desc.textContent = manualDesc;
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
    socialButton.type = "button";

    // ── 소셜 추가 동의 (가속기) ───────────────────────────────────────────────────
    // 🔴 전체 페이지 리다이렉트 폴백을 만들지 않는다. 이 모달이 뜬 시점에는 주문이 이미
    // 생성돼 있어(POST /api/billing/checkout) 페이지를 떠나면 미결제 주문이 남는다.
    // 팝업이 막히면 그냥 버튼을 감춘다 — 직접 입력이 항상 살아 있으므로 막다른 길이 아니다.
    let socialProvider = "";
    let popup: Window | null = null;
    let popupPoll = 0;
    let popupTimeout = 0;
    let onSocialMessage: ((event: MessageEvent) => void) | null = null;

    const stopWatchingPopup = () => {
      if (popupPoll) window.clearInterval(popupPoll);
      if (popupTimeout) window.clearTimeout(popupTimeout);
      popupPoll = 0;
      popupTimeout = 0;
      if (onSocialMessage) window.removeEventListener("message", onSocialMessage);
      onSocialMessage = null;
      popup = null;
    };

    const releaseSocialButton = () => {
      stopWatchingPopup();
      if (settled) return;
      socialButton.disabled = false;
      socialButton.textContent = paymentPhoneSocialCtaLabel(socialProvider);
    };

    socialButton.addEventListener("click", () => {
      const social = options.socialConsent;
      if (!social || !socialProvider) return;
      const url = social.startUrl(socialProvider);
      popup = window.open(url, "cdPhoneConsent", "width=480,height=720,noopener=no");
      if (!popup) {
        // 🔴 여기가 유일한 안전 밸브다. 팝업이 막힌 사용자는 소셜 동의 창을 열 방법이 없으므로,
        // 그때만 직접 입력을 되살린다 — 동의 우회가 아니라 브라우저 조건에 대한 대비이고,
        // 어차피 같은 번호를 같은 고지·동의와 함께 받는다. 이걸 지우면 그 사용자는 결제를 못 한다.
        socialButton.style.display = "none";
        setManualEntryVisible(true);
        desc.textContent = manualDesc;
        error.textContent = PAYMENT_PHONE_SOCIAL_BLOCKED;
        input.focus();
        return;
      }
      socialButton.disabled = true;
      socialButton.textContent = "동의 창을 여는 중...";
      error.textContent = "";

      // 동의 페이지는 워커(API) 오리진에서 서빙된다 — 페이지 오리진과 다를 수 있으므로
      // 우리가 실제로 연 URL 에서 기대 오리진을 뽑는다(추측하지 않는다).
      const expectedOrigin = new URL(url, window.location.href).origin;
      onSocialMessage = (event: MessageEvent) => {
        if (event.origin !== expectedOrigin) return;
        if (popup && event.source !== popup) return;
        const data = event.data as { type?: string; ok?: boolean } | null;
        if (!data || data.type !== "cd-phone-consent") return;
        stopWatchingPopup();
        if (data.ok !== true) {
          socialButton.disabled = false;
          socialButton.textContent = paymentPhoneSocialCtaLabel(socialProvider);
          error.textContent = PAYMENT_PHONE_SOCIAL_FAILED;
          input.focus();
          return;
        }
        socialButton.textContent = "번호를 가져오는 중...";
        social.readSavedPhoneNumber()
          .then((saved) => {
            const normalized = options.normalize(saved);
            if (normalized) {
              close(normalized);
              return;
            }
            socialButton.disabled = false;
            socialButton.textContent = paymentPhoneSocialCtaLabel(socialProvider);
            error.textContent = PAYMENT_PHONE_SOCIAL_FAILED;
          })
          .catch(() => {
            socialButton.disabled = false;
            socialButton.textContent = paymentPhoneSocialCtaLabel(socialProvider);
            error.textContent = PAYMENT_PHONE_SOCIAL_FAILED;
          });
      };
      window.addEventListener("message", onSocialMessage);
      // 사용자가 팝업을 그냥 닫았을 때도 버튼이 잠긴 채로 남지 않게 한다.
      popupPoll = window.setInterval(() => {
        if (popup && popup.closed) releaseSocialButton();
      }, 600);
      popupTimeout = window.setTimeout(releaseSocialButton, SOCIAL_CONSENT_TIMEOUT_MS);
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
    card.appendChild(socialButton);
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

    // 🔴 조회는 모달이 **뜬 뒤**에 한다. 앞으로 옮기면 2026-08-15 에 의도적으로 제거한
    // 결제 임계경로의 왕복이 되살아난다 — 모달은 즉시 뜨고, 버튼만 나중에 드러난다.
    if (options.socialConsent) {
      options.socialConsent.listProviders()
        .then((providers) => {
          if (settled) return;
          const provider = (providers || []).find((candidate) => paymentPhoneSocialCtaLabel(candidate));
          if (!provider) return;
          socialProvider = provider;
          socialButton.textContent = paymentPhoneSocialCtaLabel(provider);
          socialButton.style.display = "block";
          // 주 경로이므로 입력칸 자리로 올린다(원래는 입력칸 아래의 보조 버튼이었다).
          card.insertBefore(socialButton, fieldLabel);
          setManualEntryVisible(false);
          desc.textContent = PAYMENT_PHONE_SOCIAL_DESC;
        })
        .catch(() => {});
    }
  });
}
