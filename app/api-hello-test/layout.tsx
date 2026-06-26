import type { Metadata } from "next";

const API_HELLO_TEST_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "API 테스트",
  },
  en: {
    title: "API Test",
  },
  ja: {
    title: "APIテスト",
  },
} as const;

const apiHelloTestLayoutCopy = API_HELLO_TEST_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: apiHelloTestLayoutCopy.title,
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
