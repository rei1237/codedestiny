import Link from "next/link";
import { notFound } from "next/navigation";
import { INSIGHT_SEED_ARTICLES, getInsightSeedBySlug, getInsightSeedRelated } from "../seed-articles";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "../../../lib/structured-data";
import { getPexelsInsightImage } from "../../../lib/server/pexels";

export const dynamicParams = false;

function uniqueArticles() {
  const map = new Map();
  for (const article of INSIGHT_SEED_ARTICLES) {
    const slug = String(article?.slug || "").trim();
    if (!slug || map.has(slug)) continue;
    const sections = Array.isArray(article.sections) ? article.sections : [];
    if (sections.length === 0 && !String(article.contentHtml || article.body || "").trim()) continue;
    map.set(slug, article);
  }
  return Array.from(map.values());
}

export function generateStaticParams() {
  return uniqueArticles().map((article) => ({ slug: article.slug }));
}

function articleDescription(article) {
  return String(article.excerpt || article.description || article.subtitle || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export async function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);
  if (!article) {
    return buildSeoMetadata({
      path: `/insights/${encodeURIComponent(slug)}`,
      title: "운세 인사이트 | Code Destiny",
      description: "운세 인사이트 상세 글입니다.",
      keywords: ["운세 인사이트"],
      ogType: "article",
    });
  }

  const image = await getPexelsInsightImage(article);
  return buildSeoMetadata({
    path: `/insights/${article.slug}`,
    title: `${article.title} | 운세 인사이트`,
    description: articleDescription(article),
    keywords: Array.from(new Set([article.category, ...(article.tags || []), ...(article.keywords || []), ...(article.relatedKeywords || [])].filter(Boolean))).slice(0, 12),
    ogImage: image.src,
    ogType: "article",
  });
}

function normalizeSections(article) {
  const sections = Array.isArray(article.sections) ? article.sections : [];
  if (sections.length > 0) {
    return sections
      .map((section) => ({
        heading: String(section.heading || section.title || "").trim(),
        body: String(section.body || section.content || "").trim(),
      }))
      .filter((section) => section.heading || section.body);
  }

  const body = String(article.contentHtml || article.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return body ? [{ heading: "핵심 해석", body }] : [];
}

function relatedArticles(article) {
  return getInsightSeedRelated(article.slug, 6);
}

export default async function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);
  if (!article) notFound();

  const sections = normalizeSections(article);
  const contentHtml = String(article.contentHtml || "").trim();
  if (sections.length === 0 && !contentHtml) notFound();

  const image = await getPexelsInsightImage(article);
  const description = articleDescription(article);
  const related = relatedArticles(article);
  const articleJsonLd = buildArticleJsonLd({
    title: article.title,
    description,
    path: `/insights/${article.slug}`,
    image: image.src,
    datePublished: article.publishedAt || article.updatedAt,
    dateModified: article.updatedAt || article.publishedAt,
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: article.title, path: `/insights/${article.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#251745_0%,#10091f_46%,#07050e_100%)] text-slate-100">
      <article className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <Link href="/insights" className="text-sm font-semibold text-amber-100/80 hover:text-amber-50">
          운세 인사이트 허브
        </Link>

        <header className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30">
          <figure>
            <img src={image.src} alt={image.alt || `${article.title} 대표 이미지`} className="h-64 w-full object-cover md:h-80" />
            {image.source === "pexels" && image.credit ? (
              <figcaption className="bg-black/20 px-4 py-2 text-xs text-slate-400">
                Photo by <a className="underline" href={image.creditUrl} rel="noreferrer">{image.credit}</a> on Pexels
              </figcaption>
            ) : null}
          </figure>
          <div className="p-6 md:p-8">
            <p className="text-sm font-semibold text-amber-100/80">{article.category || "운세 인사이트"}</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white md:text-5xl">{article.title}</h1>
            {description ? <p className="mt-5 text-base leading-8 text-slate-300">{description}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {(article.tags || article.keywords || []).slice(0, 10).map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        {contentHtml ? (
          <section
            className="mt-8 rounded-2xl border border-white/10 bg-[#10172b]/85 p-5 text-base leading-8 text-slate-300 md:p-7 [&_a]:text-amber-100 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-amber-100 [&_h2:first-child]:mt-0 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-100 [&_li]:mt-2 [&_p]:mt-4 [&_strong]:text-slate-100 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <section className="mt-8 space-y-5">
            {sections.map((section, index) => (
              <section key={`${section.heading}-${index}`} className="rounded-2xl border border-white/10 bg-[#10172b]/85 p-5 md:p-7">
                {section.heading ? <h2 className="text-2xl font-semibold text-amber-100">{section.heading}</h2> : null}
                {section.body ? <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-300">{section.body}</p> : null}
              </section>
            ))}
          </section>
        )}

        {related.length > 0 ? (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
            <h2 className="text-xl font-semibold text-white">함께 보면 좋은 인사이트</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {related.map((item) => (
                <Link key={item.slug} href={`/insights/${item.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50">
                  <p className="text-xs text-amber-100/70">{item.category}</p>
                  <h3 className="mt-2 text-sm font-semibold leading-6 text-white">{item.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-400">{articleDescription(item)}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </main>
  );
}
