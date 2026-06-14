import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API 테스트",
  alternates: {
    canonical: "/api-hello-test/",
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

export default function ApiHelloTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
