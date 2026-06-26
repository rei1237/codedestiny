import type { Metadata } from "next";

const SIGNUP_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "회원가입",
    description: "Code Destiny 회원가입을 위한 비공개 페이지입니다.",
  },
  en: {
    title: "Sign Up",
    description: "Private page for creating a Code Destiny account.",
  },
  ja: {
    title: "新規登録",
    description: "Code Destiny会員登録用の非公開ページです。",
  },
} as const;

const signupLayoutCopy = SIGNUP_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: signupLayoutCopy.title,
  description: signupLayoutCopy.description,
  alternates: {
    canonical: "/signup/",
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

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
