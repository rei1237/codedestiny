import { generatePageMetadata } from "../../lib/generate-page-metadata";
import ContactUsPage from "../contact-us/page";

const CONTACT_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Contact | 문의하기 — Code Destiny",
    description: "Code Destiny 문의 페이지입니다. 이메일 폼으로 서비스 문의를 남길 수 있습니다.",
    keywords: ["Contact", "문의하기", "Code Destiny"],
  },
  en: {
    title: "Contact | Code Destiny",
    description: "Leave a service inquiry for Code Destiny through the email form.",
    keywords: ["Contact", "Support", "Code Destiny"],
  },
  ja: {
    title: "お問い合わせ | Code Destiny",
    description: "メールフォームからCode Destinyへのサービスお問い合わせを送信できます。",
    keywords: ["お問い合わせ", "サポート", "Code Destiny"],
  },
};

export function generateMetadata() {
  const copy = CONTACT_PAGE_TEXT_TRANSLATIONS.ko;
  return generatePageMetadata({
    path: "/contact",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

export default function ContactPage() {
  return <ContactUsPage />;
}
