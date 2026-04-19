import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { BreadcrumbJsonLd } from "../../../components/SeoJsonLd";
import {
  HIGH_VALUE_CATEGORIES,
  getHighValueCategoryBySlug,
  getHighValuePagesByCategory,
} from "../../content";

export const dynamicParams = false;

export function generateStaticParams() {
  return HIGH_VALUE_CATEGORIES.map((item) => ({ category: item.slug }));
}

export function generateMetadata({ params }) {
  const category = getHighValueCategoryBySlug(params?.category);
  if (!category) {
    return {
      title: "카테고리를 찾을 수 없습니다 | CODE DESTINY",
      robots: { index: false, follow: true },
    };
  }

  return generatePageMetadata({
    path: `/high-value/category/${category.slug}`,
    title: `${category.name} | 무료 사주 · 자미두수 운세 분석 문서`,
    description: `${category.name} 카테고리의 고가치 정적 문서를 모아보는 페이지입니다.`,
    keywords: [category.name, "category page", "high value content"],
  });
}

export default function HighValueCategoryPage({ params }) {
  const category = getHighValueCategoryBySlug(params?.category);
  if (!category) notFound();

  const pages = getHighValuePagesByCategory(category.slug);
  const canonical = `https://code-destiny.com/high-value/category/${category.slug}`;

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "28px 16px 56px", color: "#e2e8f0" }}>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://code-destiny.com/" },
          { name: "High-Value", url: "https://code-destiny.com/high-value" },
          { name: category.name, url: canonical },
        ]}
      />
      <nav aria-label="breadcrumb" style={{ marginBottom: "10px", fontSize: "0.88rem", color: "#cbd5e1" }}>
        <Link href="/" style={{ color: "#f8eecb" }}>홈</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <Link href="/high-value" style={{ color: "#f8eecb" }}>High-Value</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <span>{category.name}</span>
      </nav>

      <header style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.4rem,3.6vw,2rem)", color: "#f8fafc" }}>무료 사주 · 자미두수 운세 분석 {category.name}</h1>
        <p style={{ margin: "10px 0 0", lineHeight: 1.8, color: "#cbd5e1" }}>
          이 카테고리의 고가치 정적 문서를 모아 한눈에 확인할 수 있습니다.
        </p>
      </header>

      <section style={{ display: "grid", gap: "12px" }}>
        {pages.map((item) => (
          <article
            key={item.slug}
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.26)",
              background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(30,41,59,0.76))",
              padding: "14px 14px",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#f8fafc" }}>
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
