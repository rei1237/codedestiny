import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "Code Destiny 회원 로그인을 위한 비공개 페이지입니다.",
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
