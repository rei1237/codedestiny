import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { HIGH_VALUE_CATEGORIES, HIGH_VALUE_PAGES } from "./content";

const seo = publicSeoPages.highValue;

export const metadata = buildSeoMetadata(seo);

const HIGH_VALUE_PAGE_COPY = {
  ko: {
    categoryHeading: "카테고리",
  },
  en: {
    categoryHeading: "Categories",
  },
  ja: {
    categoryHeading: "カテゴリー",
  },
  zh: {
    categoryHeading: "分类",
  },
};

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "운세 인사이트 가이드", path: "/high-value" },
    ]),
    buildCollectionPageJsonLd(seo),
  ],
});

export default function HighValueHubPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label="breadcrumb" className="cd-muted" style={{ marginBottom: "10px", fontSize: "0.88rem" }}>
        <Link href="/" className="cd-chip" data-cd-trans="home.nav.home">홈</Link>
      </nav>

      <header className="cd-main-header">
        <h1 className="cd-main-title">운세 인사이트 가이드</h1>
        <p className="cd-main-intro">
          사주, 타로, 궁합, 점성술을 처음 접하는 분도 쉽게 이해할 수 있도록 핵심 개념과 해석 방법을 정리한 가이드입니다.
        </p>
      </header>

      <section style={{ marginBottom: "18px" }}>
        <h2>{HIGH_VALUE_PAGE_COPY.ko.categoryHeading}</h2>
        <div className="cd-chip-wrap">
          {HIGH_VALUE_CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/high-value/category/${category.slug}`} className="cd-chip">
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="cd-card-grid">
        {HIGH_VALUE_PAGES.map((item) => (
          <article key={item.slug} className="cd-card">
            <p style={{ margin: 0, fontSize: "12px", color: "#f8eecb" }}>{item.category}</p>
            <h2>
              <Link href={`/high-value/${item.slug}`} className="cd-link-reset">
                {item.title}
              </Link>
            </h2>
            <p>{item.summary}</p>
            <p className="cd-muted" style={{ fontSize: "12px" }}>
              작성일 {item.publishedAt} · 최종 수정일 {item.updatedAt}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
