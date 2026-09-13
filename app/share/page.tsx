import type { Metadata } from "next";
import { Suspense } from "react";
import { siteSeo } from "@/lib/seo/siteSeo";
import ResultShareClient from "./ResultShareClient";

// 🔴 noindex 는 metadata 에만 둔다. robots.txt 의 Disallow 로 막으면 카카오 스크래퍼까지 막혀
// 카드가 통째로 죽는다(/fortune/share/ 와 같은 처리 — 그 라우트도 _headers 항목이 없다).
export const metadata: Metadata = {
  title: "공유된 운세 결과 | Code Destiny",
  description: "친구가 공유한 무료 운세 결과를 확인해 보세요.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "공유된 운세 결과 | Code Destiny",
    description: "친구가 공유한 무료 운세 결과를 확인해 보세요.",
    url: "https://code-destiny.com/share/",
    siteName: siteSeo.brandName,
    locale: "ko_KR",
    type: "website",
    images: [{ url: siteSeo.defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: "공유된 운세 결과 | Code Destiny",
    description: "친구가 공유한 무료 운세 결과를 확인해 보세요.",
    images: [siteSeo.defaultOgImage],
  },
};

function LoadingState() {
  return (
    <main className="result-share-page" aria-busy="true">
      <div className="result-share-page__loading">공유된 결과를 불러오는 중이에요.</div>
    </main>
  );
}

export default function ResultSharePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResultShareClient />
    </Suspense>
  );
}
