import { trustRoutes } from "../../lib/i18n/public-trust-copy.mjs";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import ContactUsPage from "../contact-us/page";

const CONTACT_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Contact | 문의하기 — 꿀꿀 운세",
    description: "꿀꿀운세 고객지원 페이지입니다. 서비스 이용, 결제 내역 확인, 개인정보 관련 요청을 채널톡 또는 이메일 문의 폼으로 접수하고 문의 유형별 안내를 확인하세요.",
    keywords: ["Contact", "문의하기", "꿀꿀운세"],
  },
  en: {
    title: "Contact | 꿀꿀 운세",
    description: "Leave a service inquiry for 꿀꿀운세 through the email form.",
    keywords: ["Contact", "Support", "꿀꿀운세"],
  },
  ja: {
    title: "お問い合わせ | 꿀꿀 운세",
    description: "メールフォームから꿀꿀운세へのサービスお問い合わせを送信できます。",
    keywords: ["お問い合わせ", "サポート", "꿀꿀운세"],
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
