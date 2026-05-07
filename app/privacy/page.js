import { generatePageMetadata } from "../../lib/generate-page-metadata";
import PrivacyPolicyPage from "../privacy-policy/page";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/privacy",
    title: "Privacy Policy | 개인정보처리방침 — Code Destiny",
    description:
      "Code Destiny 개인정보처리방침 페이지입니다. 개인정보 수집 항목, 처리 목적, 보관 기간, 이용자 권리, 광고/쿠키 정책을 안내합니다.",
    keywords: ["Privacy Policy", "개인정보처리방침", "쿠키", "애드센스", "Google AdSense"],
  });
}

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}