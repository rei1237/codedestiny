import type { Metadata } from "next";
import { ROBOTS_META } from "../../lib/seo/index-policy.mjs";

const SIGNUP_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "회원가입",
    description: "꿀꿀운세 회원가입을 위한 비공개 페이지입니다.",
  },
  en: {
    title: "Sign Up",
    description: "Private page for creating a 꿀꿀운세 account.",
  },
  ja: {
    title: "新規登録",
    description: "꿀꿀운세会員登録用の非公開ページです。",
  },
} as const;

const signupLayoutCopy = SIGNUP_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: signupLayoutCopy.title,
  description: signupLayoutCopy.description,
  alternates: {
    canonical: "/signup/",
  },
  robots: ROBOTS_META.NOINDEX,
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
