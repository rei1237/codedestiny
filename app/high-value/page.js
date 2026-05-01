import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { BreadcrumbJsonLd } from "../components/SeoJsonLd";
import { HIGH_VALUE_CATEGORIES, HIGH_VALUE_PAGES } from "./content";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/high-value",
    title: "High-Value Guides & Articles | CODE DESTINY",
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
    <main className="cd-main-shell">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://code-destiny.com/" },
          { name: "High-Value", url: "https://code-destiny.com/high-value" },
        ]}
      />
      <nav aria-label="breadcrumb" style={{ marginBottom: "10px", fontSize: "0.88rem" }} className="cd-muted">
        <Link href="/" style={{ color: "#f8eecb" }}>홈</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <span>High-Value</span>
      </nav>

      <header className="cd-main-header">
        <h1 className="cd-main-title">
          High-Value Static Pages
        </h1>
        <p className="cd-main-intro">
          아래 문서는 광고 승인 관점에서 필요한 정보 밀도, 문맥성, 사용자 질문 대응력을 높이기 위해 작성된 장문 초안입니다.
        </p>
      </header>

      <section style={{ marginBottom: "14px" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", color: "#f8fafc" }}>카테고리 페이지</h2>
        <div className="cd-chip-wrap">
          {HIGH_VALUE_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/high-value/category/${category.slug}`}
              className="cd-chip"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="cd-card-grid">
        {HIGH_VALUE_PAGES.map((item) => (
          <article key={item.slug} className="cd-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#f8eecb" }}>{item.category}</p>
            <h2 style={{ margin: "6px 0 8px", fontSize: "1.1rem", color: "#f8fafc" }}>
              <Link href={`/high-value/${item.slug}`} className="cd-link-reset">
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
