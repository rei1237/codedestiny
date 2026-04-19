import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { BreadcrumbJsonLd } from "../components/SeoJsonLd";
import { HIGH_VALUE_CATEGORIES, HIGH_VALUE_PAGES } from "./content";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/high-value",
    title: "무료 사주 · 자미두수 운세 분석 High-Value 가이드 | CODE DESTINY",
    description:
      "AdSense 승인 품질 기준에 맞춘 장문 가이드, 정보형 아티클, FAQ 문서를 한 곳에서 확인하세요.",
    keywords: [
      "high value content",
      "saju guide",
      "tarot guide",
      "destiny article",
      "compatibility signs",
      "faq",
    ],
  });
}

export default function HighValueHubPage() {
  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "28px 16px 56px", color: "#e2e8f0" }}>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://code-destiny.com/" },
          { name: "High-Value", url: "https://code-destiny.com/high-value" },
        ]}
      />
      <nav aria-label="breadcrumb" style={{ marginBottom: "10px", fontSize: "0.88rem", color: "#cbd5e1" }}>
        <Link href="/" style={{ color: "#f8eecb" }}>홈</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <span>High-Value</span>
      </nav>

      <header style={{ marginBottom: "18px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.4rem,3.6vw,2rem)", color: "#f8fafc" }}>
          무료 사주 · 자미두수 운세 분석 High-Value 문서 허브
        </h1>
        <p style={{ margin: "10px 0 0", lineHeight: 1.8, color: "#cbd5e1" }}>
          아래 문서는 광고 승인 관점에서 필요한 정보 밀도, 문맥성, 사용자 질문 대응력을 높이기 위해 작성된 장문 초안입니다.
        </p>
      </header>

      <section style={{ marginBottom: "14px" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", color: "#f8fafc" }}>카테고리 페이지</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {HIGH_VALUE_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/high-value/category/${category.slug}`}
              style={{
                borderRadius: "999px",
                padding: "6px 12px",
                border: "1px solid rgba(148,163,184,0.32)",
                background: "rgba(15,23,42,0.7)",
                color: "#f8eecb",
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: "12px" }}>
        {HIGH_VALUE_PAGES.map((item) => (
          <article
            key={item.slug}
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.26)",
              background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(30,41,59,0.76))",
              padding: "14px 14px",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "#f8eecb" }}>{item.category}</p>
            <h2 style={{ margin: "6px 0 8px", fontSize: "1.1rem", color: "#f8fafc" }}>
              <Link href={`/high-value/${item.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                {item.title}
              </Link>
            </h2>
            <p style={{ margin: 0, lineHeight: 1.75, color: "#dbe5ff" }}>{item.summary}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
