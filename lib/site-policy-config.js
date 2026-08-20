export const SUPPORT_EMAIL = (
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  process.env.CONTACT_EMAIL ||
  "admin@code-destiny.com"
).trim();

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const OPERATOR_NAME = (
  process.env.NEXT_PUBLIC_OPERATOR_NAME ||
  process.env.OPERATOR_NAME ||
  "Code Destiny"
).trim();

/**
 * 사업자 신원 정본.
 *
 * 🔴 값은 **등록된 그대로**여야 한다. 상호·대표자명·신고번호·주소는 법적 표기라
 * 읽기 좋게 다듬으면 안 된다.
 *
 * 여기 둔 이유: 전자상거래법이 요구하는 표기이면서, 동시에 AdSense 심사가 보는
 * "이 사이트를 누가 운영하는가" 신호다. 그래서 푸터와 /contact 두 곳이 함께 쓴다.
 * 이 상수가 생기기 전에는 app/components/SiteFooterHub.jsx 안에 값이 박혀 있었고,
 * /contact 본문에는 아예 없었다 — 문의 페이지에 운영 주체가 없는 상태였다.
 *
 * 🔴 **값은 번역하지 않는다. 라벨만 번역한다.** 상호·대표자명·신고번호·주소는 등록된 문자열
 *    자체가 법적 형식이라, 다른 언어로 옮기는 순간 **등록되지 않은 사업자 정보를 표시**하게 된다.
 *    2026-08-20 실측으로 그 상태가 실제로 있었다:
 *      · 상호가 12개 로케일에서 번역돼 있었다 — ja `コードの運命` · de `Code-Schicksal` · vi `Mã số mệnh`
 *      · 신고번호가 로케일마다 달랐다 — ko `제 2026-화성호-0264 호` · en `2026-Hwaseongho-0264`
 *        · ja 사전 `2026-華城湖-0264` · lib/legal/legalContent.ts 의 ja `第2026-火城湖-0264号`
 *        (같은 일본어 안에서도 두 값이 달랐다)
 *      · 주소 한자가 갈렸다 — `孝行` vs `孝興`, `飛鳳` vs `飛峰`
 *    번호와 이름은 식별자다. 음역 대상이 아니다.
 *
 * 🔴 사본을 새로 만들지 말 것. 이 상수에서 파생시키고, 그럴 수 없는 곳(정적 셸 index.html ·
 *    public/i18n 사전 12벌)은 `npm run verify:business-identity` 가 값 동일성을 단언한다.
 */
export const BUSINESS_IDENTITY = {
  companyName: "코드 데스티니 (Code Destiny)",
  representative: "박병하",
  registrationNumber: "372-23-02329",
  mailOrderNumber: "제 2026-화성호-0264 호",
  phone: "050-6664-7398",
  email: "admin@code-destiny.com",
  address: "경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호",
};

/**
 * 해외 독자용 국제 표기. 손으로 적지 않고 등록 번호에서 기계적으로 만든다 —
 * 두 값이 갈라질 여지를 없앤다(en 약관이 `+82-50-...` 를 따로 박아 두고 있었다).
 */
export const BUSINESS_PHONE_INTL = `+82-${BUSINESS_IDENTITY.phone.replace(/^0/, "")}`;
