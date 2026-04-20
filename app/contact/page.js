import { generatePageMetadata } from "../../lib/generate-page-metadata";
import ContactUsPage from "../contact-us/page";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/contact",
    title: "Contact | 문의하기 — Code Destiny",
    description: "Code Destiny 문의 페이지입니다. 이메일 폼으로 서비스 문의를 남길 수 있습니다.",
    keywords: ["Contact", "문의하기", "Code Destiny"],
  });
}

export default function ContactPage() {
  return <ContactUsPage />;
}
