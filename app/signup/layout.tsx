import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "Code Destiny 회원가입을 위한 비공개 페이지입니다.",
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
