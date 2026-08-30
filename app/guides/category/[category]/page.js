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

const HIGH_VALUE_CATEGORY_METADATA_COPY = {
  ko: {
    notFoundTitle: "카테고리를 찾을 수 없습니다 | Code Destiny",
  },
  en: {
    notFoundTitle: "Category not found | Code Destiny",
  },
  ja: {
    notFoundTitle: "カテゴリが見つかりません | Code Destiny",
  },
  zh: {
    notFoundTitle: "未找到分类 | Code Destiny",
  },
};

export function generateStaticParams() {
  return HIGH_VALUE_CATEGORIES.map((item) => ({ category: item.slug }));
}

function buildCategoryDescription(category, pages = []) {
  const base = String(category?.description || "").trim();
  if (base.length >= 50) return base;

  const titleList = pages
    .slice(0, 3)
    .map((item) => item.title)
    .filter(Boolean)
    .join(", ");
  const articleHint = titleList ? `${titleList} 흐름을 함께 묶어 ` : "";

  return `${base} ${articleHint}${category.name}를 처음 읽는 사람이 개념, 사용 상황, 해석의 한계와 주의점을 한 번에 이해하도록 정리합니다.`;
}

export function generateMetadata({ params }) {
  const category = getHighValueCategoryBySlug(params?.category);
  if (!category) {
    return {
      title: HIGH_VALUE_CATEGORY_METADATA_COPY.ko.notFoundTitle,
      robots: { index: false, follow: false },
    };
  }

  const pages = getHighValuePagesByCategory(category.slug);
  const description = buildCategoryDescription(category, pages);

  return buildSeoMetadata({
    path: `/guides/category/${category.slug}`,
    title: `${category.name} 가이드 | Code Destiny`,
    description,
    keywords: [category.name, "운세 인사이트", "Code Destiny"],
  });
}

export default function HighValueCategoryPage({ params }) {
  const category = getHighValueCategoryBySlug(params?.category);
  if (!category) notFound();

  const pages = getHighValuePagesByCategory(category.slug);
  const description = buildCategoryDescription(category, pages);
  const path = `/guides/category/${category.slug}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "운세 인사이트 가이드", path: "/guides" },
        { name: category.name, path },
      ]),
      buildCollectionPageJsonLd({
        path,
        title: `${category.name} 가이드`,
        description,
      }),
    ],
  });

  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label="breadcrumb" className="cd-chip-wrap">
        <Link href="/" className="cd-chip" data-cd-trans="home.nav.home">홈</Link>
        <Link href="/guides" className="cd-chip">운세 인사이트 가이드</Link>
      </nav>

      <header className="cd-main-header">
        <h1 className="cd-main-title">{category.name} 가이드</h1>
        <p className="cd-main-intro">{description}</p>
      </header>

      <section className="cd-card-grid">
        {pages.map((item) => (
          <article key={item.slug} className="cd-card">
            <h2>
              <Link href={`/guides/${item.slug}`} className="cd-link-reset">
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
