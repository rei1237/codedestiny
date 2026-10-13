import { trustRoutes } from "../../lib/i18n/public-trust-copy.mjs";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import ContactUsPage from "../contact-us/page";

const CONTACT_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Contact | 문의하기 — 꿀꿀 운세",
    description: "꿀꿀 운세 문의 페이지입니다. 이메일 폼으로 서비스 문의를 남길 수 있습니다.",
    keywords: ["Contact", "문의하기", "꿀꿀 운세"],
  },
  en: {
    title: "Contact | 꿀꿀 운세",
    description: "Leave a service inquiry for 꿀꿀 운세 through the email form.",
    keywords: ["Contact", "Support", "꿀꿀 운세"],
  },
  ja: {
    title: "お問い合わせ | 꿀꿀 운세",
    description: "メールフォームから꿀꿀 운세へのサービスお問い合わせを送信できます。",
    keywords: ["お問い合わせ", "サポート", "꿀꿀 운세"],
  },
};

export function generateMetadata() {
  const copy = CONTACT_PAGE_TEXT_TRANSLATIONS.ko;
  return generatePageMetadata({
    path: "/contact",
    hreflangPaths: trustRoutes("contact"),
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

export default function ContactPage() {
  return <ContactUsPage />;
}
