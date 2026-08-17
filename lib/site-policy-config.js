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
 * 🔴 아직 정본이 아닌 사본이 둘 남아 있다(이번 범위 밖):
 *   - app/components/LocaleFooterHub.jsx (로케일 푸터)
 *   - index.html 의 #cdFooterBusinessDetails (정적 셸, sync:public 이 6개 셸에 복제)
 * 값을 바꾸면 그 둘도 함께 고칠 것.
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
