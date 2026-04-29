"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { FaqJsonLd } from "./components/SeoJsonLd";
import { withUniqueRouteMetadata } from "../lib/generate-page-metadata";
import { HOME_FAQ_ITEMS, HOME_FAQ_SECTION_COPY } from "./_content/seo-copy";
import PremiumCollectionClientWrapper from "./components/PremiumCollectionClientWrapper";

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

function serializeSearchParams(searchParams) {
  if (!searchParams || typeof searchParams !== "object") return "";
  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (!key) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string" && entry.length > 0) query.append(key, entry);
      });
      return;
    }
    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    }
  });

  return query.toString();
}

export default function Home() {
  const searchParams = useSearchParams();

  const iframeSrc = useMemo(() => {
    const iframeQuery = serializeSearchParams(Object.fromEntries(searchParams.entries()));
    return iframeQuery ? `/static/index.html?${iframeQuery}` : "/static/index.html";
  }, [searchParams]);

  return (
    <main style={{ minHeight: "100vh", background: "#05070f", color: "#e5e7eb" }}>
      <FaqJsonLd faqs={HOME_FAQ_ITEMS} />

      {/* 프리미엄 운세 컬렉션 카드: FAQ 위, iframe 아래에 직접 노출 (Client Wrapper) */}
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "32px 0 0" }}>
        <PremiumCollectionClientWrapper />
      </div>

      {/* 운명의 꽃 아틀리에 숨김 처리를 위한 스타일 */}
      <style jsx global>{`
        /* 운명의 꽃 아틀리에 섹션 숨김 */
        [data-section="flower-atelier"],
        .flower-atelier,
        .destiny-flower,
        #flower-atelier,
        section:has(> h2[class*="flower"]),
        section:has(> h2:contains("운명의 꽃")),
        div:has(> h2:contains("운명의 꽃")),
        .flower-card,
        .atelier-card {
          display: none !important;
        }
      `}</style>

      <iframe
        src={iframeSrc}
        title="Code Destiny Main Service"
        style={{
          width: "100%",
          height: "100vh",
          border: 0,
          display: "block",
          background: "transparent",
        }}
      />

      <section
        aria-labelledby="homeFaqHeading"
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "56px 18px 86px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: "20px",
            padding: "22px 18px",
            background:
              "linear-gradient(140deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))",
            boxShadow: "0 18px 40px rgba(2, 6, 23, 0.45)",
          }}
        >
          <h1
            id="homeFaqHeading"
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
              fontWeight: 800,
              color: "#f8fafc",
              lineHeight: 1.35,
            }}
          >
            {HOME_FAQ_SECTION_COPY.heading}
          </h1>
          <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.9, fontSize: "0.97rem" }}>
            {HOME_FAQ_SECTION_COPY.intro}
          </p>
        </div>

        <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          {HOME_FAQ_ITEMS.map((item, index) => (
            <article
              key={item.question}
              style={{
                border: "1px solid rgba(148,163,184,0.28)",
                borderRadius: "16px",
                background: "rgba(15, 23, 42, 0.86)",
                padding: "18px 16px",
              }}
            >
              <h3 style={{ margin: "0 0 8px", color: "#f1f5f9", fontSize: "1.03rem", lineHeight: 1.5 }}>
                Q{index + 1}. {item.question}
              </h3>
              <p style={{ margin: 0, color: "#dbeafe", lineHeight: 1.95, fontSize: "0.95rem", wordBreak: "keep-all" }}>
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
