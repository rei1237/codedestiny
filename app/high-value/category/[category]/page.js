import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "../../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../../lib/structured-data";
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
      title: "카테고리를 찾을 수 없습니다 | Code Destiny",
      robots: { index: false, follow: false },
    };
  }

  return buildSeoMetadata({
    path: `/high-value/category/${category.slug}`,
    title: `${category.name} 가이드 | Code Destiny`,
    description: category.description,
    keywords: [category.name, "운세 인사이트", "Code Destiny"],
  });
}

export default function HighValueCategoryPage({ params }) {
  const category = getHighValueCategoryBySlug(params?.category);
  if (!category) notFound();

  const pages = getHighValuePagesByCategory(category.slug);
  const path = `/high-value/category/${category.slug}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "운세 인사이트 가이드", path: "/high-value" },
        { name: category.name, path },
      ]),
      buildCollectionPageJsonLd({
        path,
        title: `${category.name} 가이드`,
        description: category.description,
      }),
    ],
  });

  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label="breadcrumb" className="cd-chip-wrap">
        <Link href="/" className="cd-chip">홈</Link>
        <Link href="/high-value" className="cd-chip">운세 인사이트 가이드</Link>
      </nav>

      <header className="cd-main-header">
        <h1 className="cd-main-title">{category.name} 가이드</h1>
        <p className="cd-main-intro">{category.description}</p>
      </header>

      <section className="cd-card-grid">
        {pages.map((item) => (
          <article key={item.slug} className="cd-card">
            <h2>
              <Link href={`/high-value/${item.slug}`} className="cd-link-reset">
                {item.title}
              </Link>
            </h2>
            <p>{item.summary}</p>
            <p className="cd-muted" style={{ fontSize: "12px" }}>
              최종 수정일 {item.updatedAt}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
