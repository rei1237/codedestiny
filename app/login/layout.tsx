import type { Metadata } from "next";
import { ROBOTS_META } from "../../lib/seo/index-policy.mjs";

const LOGIN_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "로그인",
    description: "꿀꿀운세 회원 로그인을 위한 비공개 페이지입니다.",
  },
  en: {
    title: "Log In",
    description: "Private page for 꿀꿀운세 member login.",
  },
  ja: {
    title: "ログイン",
    description: "꿀꿀운세会員ログイン用の非公開ページです。",
  },
} as const;

const loginLayoutCopy = LOGIN_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: loginLayoutCopy.title,
  description: loginLayoutCopy.description,
  alternates: {
    canonical: "/login/",
  },
  robots: ROBOTS_META.NOINDEX,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
