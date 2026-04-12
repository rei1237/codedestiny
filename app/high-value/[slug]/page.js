import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "../../components/SeoJsonLd";
import { HIGH_VALUE_PAGES, getHighValuePageBySlug } from "../content";

export const dynamicParams = false;

export function generateStaticParams() {
  return HIGH_VALUE_PAGES.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }) {
  const page = getHighValuePageBySlug(params?.slug);
  if (!page) {
    return {
      title: "문서를 찾을 수 없습니다 | CODE DESTINY",
      robots: { index: false, follow: false },
    };
  }

  return generatePageMetadata({
    path: `/high-value/${page.slug}`,
    title: `${page.title} | CODE DESTINY`,
    description: page.summary,
    keywords: [page.title, page.category, "high value article", "adsense content"],
    updatedAt: page.updatedAt,
  });
}

export default function HighValueDetailPage({ params }) {
  const page = getHighValuePageBySlug(params?.slug);
  if (!page) notFound();

  const relatedPages = HIGH_VALUE_PAGES.filter((item) => item.slug !== page.slug).slice(0, 5);
  const canonicalUrl = `https://code-destiny.com/high-value/${page.slug}`;

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "28px 16px 64px", color: "#e2e8f0" }}>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://code-destiny.com/" },
          { name: "High-Value", url: "https://code-destiny.com/high-value" },
          { name: page.title, url: canonicalUrl },
        ]}
      />
      <ArticleJsonLd
        url={canonicalUrl}
        title={page.title}
        description={page.summary}
        datePublished={page.updatedAt}
        dateModified={page.updatedAt}
        articleSection={page.category}
        inLanguage="en"
        keywords={[page.title, page.category, "static guide", "informational content"]}
      />
      <FaqJsonLd faqs={page.faq} />

      <nav aria-label="breadcrumb" style={{ marginBottom: "10px", fontSize: "0.88rem", color: "#cbd5e1" }}>
        <Link href="/" style={{ color: "#f8eecb" }}>홈</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <Link href="/high-value" style={{ color: "#f8eecb" }}>High-Value</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <Link
          href={`/high-value/category/${String(page.category).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}
          style={{ color: "#f8eecb" }}
        >
          {page.category}
        </Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <span>{page.title}</span>
      </nav>

      <header style={{ marginBottom: "16px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#f8eecb" }}>{page.category}</p>
        <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(1.5rem,3.8vw,2.2rem)", color: "#f8fafc", lineHeight: 1.35 }}>
          {page.title}
        </h1>
        <p style={{ margin: 0, lineHeight: 1.8, color: "#cbd5e1" }}>{page.summary}</p>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#94a3b8" }}>Updated: {page.updatedAt}</p>
      </header>

      <article style={{ maxWidth: "860px" }}>
        {page.sections.map((section) => (
          <section
            key={section.h2}
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.24)",
              background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.72))",
              padding: "20px 18px",
              marginBottom: "14px",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "10px", fontSize: "clamp(1.08rem,2.2vw,1.24rem)", color: "#f8fafc", lineHeight: 1.45 }}>{section.h2}</h2>
            {section.paragraphs.map((text, idx) => (
              <p key={idx} style={{ margin: idx === 0 ? "0" : "12px 0 0", lineHeight: 1.92, fontSize: "clamp(0.99rem,2.3vw,1.08rem)", color: "#dbe5ff" }}>
                {text}
              </p>
            ))}
          </section>
        ))}
      </article>

      <section
        style={{
          borderRadius: "14px",
          border: "1px solid rgba(148,163,184,0.24)",
          background: "rgba(15,23,42,0.7)",
          padding: "16px 14px",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "10px", fontSize: "1.15rem", color: "#f8fafc" }}>Frequently Asked Questions</h2>
        {page.faq.map((item, idx) => (
          <article key={`${item.question}-${idx}`} style={{ marginTop: idx === 0 ? 0 : "10px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc" }}>{item.question}</h3>
            <p style={{ margin: "6px 0 0", lineHeight: 1.8, color: "#dbe5ff" }}>{item.answer}</p>
          </article>
        ))}
      </section>

      <section
        style={{
          borderRadius: "14px",
          border: "1px solid rgba(148,163,184,0.24)",
          background: "rgba(15,23,42,0.7)",
          padding: "16px 14px",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "10px", fontSize: "1.15rem", color: "#f8fafc" }}>Related High-Value Articles</h2>
        <ul style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "8px" }}>
          {relatedPages.map((item) => (
            <li key={item.slug}>
              <Link href={`/high-value/${item.slug}`} style={{ color: "#f8eecb", textDecoration: "underline" }}>
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/high-value" style={{ color: "#f8eecb" }}>High-Value Hub</Link>
        <Link href="/insights" style={{ color: "#f8eecb" }}>Insights</Link>
        <Link href="/faq" style={{ color: "#f8eecb" }}>FAQ</Link>
        <Link href="/methodology" style={{ color: "#f8eecb" }}>Methodology</Link>
      </nav>
    </main>
  );
}
