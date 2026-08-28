import type { Metadata } from "next";
import { Suspense } from "react";
import { siteSeo } from "@/lib/seo/siteSeo";
import GuardianFortuneShareClient from "./GuardianFortuneShareClient";

export const metadata: Metadata = {
  title: "공유된 오늘의 귀인 운세 | Code Destiny",
  description: "연이와 네오가 읽어준 오늘의 귀인 운세를 확인해 보세요.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "공유된 오늘의 귀인 운세 | Code Destiny",
    description: "사주·타로·점성술의 흐름을 엮어 오늘의 메시지를 읽어봤어요.",
    url: "https://code-destiny.com/fortune/share/",
    siteName: siteSeo.brandName,
    locale: "ko_KR",
    type: "website",
    images: [{ url: siteSeo.defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: "공유된 오늘의 귀인 운세 | Code Destiny",
    description: "연이와 네오가 읽어준 오늘의 귀인 운세를 확인해 보세요.",
    images: [siteSeo.defaultOgImage],
  },
};

function LoadingState() {
  return (
    <main className="guardian-share-page" aria-busy="true">
      <div className="guardian-share-page__loading">공유된 운세를 불러오는 중이에요.</div>
    </main>
  );
}

export default function GuardianFortuneSharePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GuardianFortuneShareClient />
    </Suspense>
  );
}
