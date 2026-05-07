import { generatePageMetadata } from "../../lib/generate-page-metadata";
import TermsOfServicePage from "../terms-of-service/page";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/terms",
    title: "Terms of Service | 이용약관 — Code Destiny",
    description:
      "Code Destiny 이용약관 페이지입니다. 서비스 이용조건, 면책, 책임 제한, 환불 정책, 분쟁 처리 원칙을 안내합니다.",
    keywords: ["Terms of Service", "이용약관", "면책", "책임 제한", "환불 정책"],
  });
}

export default function TermsPage() {
  return <TermsOfServicePage />;
}