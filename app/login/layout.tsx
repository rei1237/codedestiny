import type { Metadata } from "next";

const LOGIN_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "로그인",
    description: "Code Destiny 회원 로그인을 위한 비공개 페이지입니다.",
  },
  en: {
    title: "Log In",
    description: "Private page for Code Destiny member login.",
  },
  ja: {
    title: "ログイン",
    description: "Code Destiny会員ログイン用の非公開ページです。",
  },
} as const;

const loginLayoutCopy = LOGIN_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: loginLayoutCopy.title,
  description: loginLayoutCopy.description,
  alternates: {
    canonical: "/login/",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
