import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 페이지",
  description: "Code Destiny 운영 관리를 위한 비공개 관리자 페이지입니다.",
  alternates: {
    canonical: "/admin/",
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
