import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { I18N_POLICY_ROUTE_MAP } from "../../lib/i18n/routes";
import PrivacyPolicyPage from "../privacy-policy/page";

const PRIVACY_METADATA_COPY = {
  ko: {
    title: "Privacy Policy | 개인정보처리방침 — Code Destiny",
    description:
      "Code Destiny 개인정보처리방침 페이지입니다. 개인정보 수집 항목, 처리 목적, 보관 기간, 이용자 권리, 광고/쿠키 정책을 안내합니다.",
    keywords: ["Privacy Policy", "개인정보처리방침", "쿠키", "애드센스", "Google AdSense"],
  },
  en: {
    title: "Privacy Policy | Code Destiny",
    description:
      "Code Destiny's privacy policy explains collected data, processing purposes, retention periods, user rights, and advertising and cookie policies.",
    keywords: ["Privacy Policy", "cookies", "AdSense", "Google AdSense", "user rights"],
  },
  ja: {
    title: "プライバシーポリシー | Code Destiny",
    description:
      "Code Destinyのプライバシーポリシーです。収集する情報、処理目的、保管期間、利用者の権利、広告・Cookieポリシーを案内します。",
    keywords: ["プライバシーポリシー", "Cookie", "AdSense", "Google AdSense", "利用者の権利"],
  },
  zh: {
    title: "隐私政策 | Code Destiny",
    description:
      "Code Destiny 隐私政策说明收集项目、处理目的、保存期限、用户权利以及广告和 Cookie 政策。",
    keywords: ["隐私政策", "Cookie", "AdSense", "Google AdSense", "用户权利"],
  },
};

export function generateMetadata() {
  const copy = PRIVACY_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/privacy",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    // 리턴 태그. 이게 없으면 /ja·/zh·/zh-tw·/en 쪽에서 ko 를 가리켜도 한 방향이라 쌍이 통째로 버려진다.
    hreflangPaths: I18N_POLICY_ROUTE_MAP.privacy,
  });
}

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
