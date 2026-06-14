import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";
import ShareWidget from "../../components/ShareWidget";
import { HIGH_VALUE_PAGES, getHighValuePageBySlug } from "../content";

export const dynamicParams = false;

export function generateStaticParams() {
  return HIGH_VALUE_PAGES.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }) {
  const page = getHighValuePageBySlug(params?.slug);
  if (!page) {
    return {
      title: "문서를 찾을 수 없습니다 | Code Destiny",
      robots: { index: false, follow: false },
    };
  }

  return buildSeoMetadata({
    path: `/high-value/${page.slug}`,
    title: `${page.title} | Code Destiny`,
    description: page.summary,
    ogImage: "https://code-destiny.com/og/code-destiny-og.png",
    keywords: [page.title, page.category, "운세 인사이트", "사주", "타로"],
  });
}

export default function HighValueDetailPage({ params }) {
  const page = getHighValuePageBySlug(params?.slug);
  if (!page) notFound();

  const relatedPages = HIGH_VALUE_PAGES.filter((item) => item.slug !== page.slug).slice(0, 3);
  const path = `/high-value/${page.slug}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "운세 인사이트 가이드", path: "/high-value" },
        { name: page.title, path },
      ]),
      buildArticleJsonLd({
        title: page.title,
        description: page.summary,
        path,
        author: page.author,
        category: page.category,
        keywords: [page.category, page.title, "운세 가이드"],
        datePublished: page.publishedAt,
        dateModified: page.updatedAt,
      }),
      buildFaqPageJsonLd(page.faq),
    ],
  });

  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label="breadcrumb" className="cd-chip-wrap">
        <Link href="/" className="cd-chip">홈</Link>
        <Link href="/high-value" className="cd-chip">운세 인사이트 가이드</Link>
        <Link href={`/high-value/category/${page.categorySlug}`} className="cd-chip">{page.category}</Link>
      </nav>

      <article>
        <header className="cd-main-header">
          <p className="cd-muted">{page.category}</p>
          <h1 className="cd-main-title">{page.title}</h1>
          <p className="cd-main-intro">{page.summary}</p>
          <p className="cd-muted">
            작성일 {page.publishedAt} · 최종 수정일 {page.updatedAt} · {page.author}
          </p>
        </header>

        {page.sections.map((section) => (
          <section key={section.h2} className="cd-card">
            <h2>{section.h2}</h2>
            {section.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
        ))}

        <section className="cd-card">
          <h2>주의와 면책</h2>
          <p>{page.disclaimer}</p>
        </section>

        <section className="cd-card">
          <h2>자주 묻는 질문</h2>
          {page.faq.map((item) => (
            <article key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </section>

        <section className="cd-card">
          <h2>관련 서비스</h2>
          <div className="cd-chip-wrap">
            {page.serviceLinks.map((link) => (
              <Link key={link.href} href={link.href} className="cd-chip">
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="cd-card">
          <h2>다음에 읽을 글</h2>
          <ul>
            {relatedPages.map((item) => (
              <li key={item.slug}>
                <Link href={`/high-value/${item.slug}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <ShareWidget
        title={page.title}
        description={page.summary}
        path={path}
        contentType="article"
        contentId={page.slug}
      />
    </main>
  );
}
