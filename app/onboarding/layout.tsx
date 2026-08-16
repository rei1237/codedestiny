import type { Metadata } from "next";

const ONBOARDING_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "프로필 마무리",
    description: "Code Destiny 계정 정보를 마무리하는 비공개 페이지입니다.",
  },
  en: {
    title: "Finish your profile",
    description: "Private page for completing your Code Destiny account details.",
  },
  ja: {
    title: "プロフィールの仕上げ",
    description: "Code Destinyのアカウント情報を仕上げる非公開ページです。",
  },
} as const;

const onboardingLayoutCopy = ONBOARDING_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: onboardingLayoutCopy.title,
  description: onboardingLayoutCopy.description,
  alternates: {
    canonical: "/onboarding/",
  },
  // 로그인한 사용자만 보는 화면이라 색인 대상이 아니다(/signup 과 같은 취급).
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
