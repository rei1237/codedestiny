import { Suspense } from "react";
import { withUniqueRouteMetadata } from "../lib/generate-page-metadata";
import HomeClient from "./HomeClient";

export const metadata = withUniqueRouteMetadata("/", {
  title: "무료 사주팔자 · 타로 · 오늘의 운세 | 코드 데스티니(Code Destiny) 꿀꿀 만세력",
  description:
    "생년월일로 보는 무료 사주팔자·타로 리딩·오늘의 운세. 자미두수·점성술·숙요점·궁합·신년운세·토정비결·꿈해몽·대운 분석까지. 코드 데스티니(Code Destiny) 꿀꿀 만세력 — 동서양 운세 무료 통합 플랫폼.",
  alternates: {
    canonical: "https://code-destiny.com/",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/",
    title: "무료 사주팔자·타로·오늘의 운세 | 코드 데스티니",
    description:
      "생년월일 하나로 사주팔자·타로·자미두수·점성술·궁합·신년운세를 무료로. 코드 데스티니(Code Destiny) 꿀꿀 만세력.",
    siteName: "코드 데스티니 꿀꿀 만세력",
    locale: "ko_KR",
    images: [
      {
        url: "https://code-destiny.com/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "코드 데스티니 꿀꿀 만세력",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "코드 데스티니 — 무료 사주·타로·운세",
    description: "무료 사주팔자·타로·궁합·신년운세 통합 — 코드 데스티니(Code Destiny)",
    images: ["https://code-destiny.com/icons/og-image.png"],
  },
});

export default function Home() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", background: "#05070f", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid rgba(124,58,237,0.3)", borderTop: "3px solid #a78bfa", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>로딩 중...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    }>
      <HomeClient />
    </Suspense>
  );
}
