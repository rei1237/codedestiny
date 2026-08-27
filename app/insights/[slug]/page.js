import Link from "next/link";
import { notFound } from "next/navigation";
import { INSIGHT_SEED_ARTICLES, getInsightSeedBySlug, getInsightSeedRelated } from "../seed-articles";
import { INSIGHT_SEO_TITLES } from "../seo-titles";
import { INSIGHT_SEO_DESCRIPTIONS } from "../seo-descriptions";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "../../../lib/structured-data";
import { getPexelsInsightImage } from "../../../lib/server/pexels";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { FusionCrossSell } from "../../components/FusionCrossSell";

export const dynamicParams = false;

const INSIGHT_FALLBACK_IMAGES = {
  saju: { src: "/fuctionassets/saju.webp", alt: "사주 인사이트 대표 이미지" },
  tarot: { src: "/fuctionassets/tarolove.webp", alt: "타로 인사이트 대표 이미지" },
  astrology: { src: "/fuctionassets/jumsung.webp", alt: "점성술 인사이트 대표 이미지" },
  ziwei: { src: "/fuctionassets/jami.webp", alt: "자미두수 인사이트 대표 이미지" },
  sukuyo: { src: "/fuctionassets/sukyo.webp", alt: "숙요점 인사이트 대표 이미지" },
  vedic: { src: "/fuctionassets/veda.webp", alt: "베다 점성술 인사이트 대표 이미지" },
  dream: { src: "/fuctionassets/heamong.webp", alt: "꿈해몽 인사이트 대표 이미지" },
  default: { src: "/og/insights-og.png", alt: "운세 인사이트 대표 이미지" },
};

const INSIGHT_DETAIL_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    fallbackTitle: "운세 인사이트 | Code Destiny",
    fallbackDescription: "운세 인사이트 상세 글입니다.",
    fallbackKeyword: "운세 인사이트",
    titleSuffix: "운세 인사이트",
  },
  en: {
    fallbackTitle: "Fortune Insights | Code Destiny",
    fallbackDescription: "Detailed fortune insight article.",
    fallbackKeyword: "fortune insights",
    titleSuffix: "Fortune Insights",
  },
  ja: {
    fallbackTitle: "運勢インサイト | Code Destiny",
    fallbackDescription: "運勢インサイトの詳細記事です。",
    fallbackKeyword: "運勢インサイト",
    titleSuffix: "運勢インサイト",
  },
};

function getStaticInsightImage(article) {
  const bag = [
    article?.slug,
    article?.title,
    article?.category,
    ...(Array.isArray(article?.tags) ? article.tags : []),
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
  ].join(" ").toLowerCase();
  if (/ziwei|자미/.test(bag)) return INSIGHT_FALLBACK_IMAGES.ziwei;
  if (/sukuyo|숙요/.test(bag)) return INSIGHT_FALLBACK_IMAGES.sukuyo;
  if (/tarot|타로/.test(bag)) return INSIGHT_FALLBACK_IMAGES.tarot;
  if (/vedic|베다/.test(bag)) return INSIGHT_FALLBACK_IMAGES.vedic;
  if (/astrology|점성|zodiac/.test(bag)) return INSIGHT_FALLBACK_IMAGES.astrology;
  if (/dream|꿈/.test(bag)) return INSIGHT_FALLBACK_IMAGES.dream;
  if (/saju|사주|만세력/.test(bag)) return INSIGHT_FALLBACK_IMAGES.saju;
  return INSIGHT_FALLBACK_IMAGES.default;
}

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
  // 표에 있으면 그 문구가 완성본이다. 없으면 기존 우선순위대로 고른다 —
  // 폭 절단은 buildSeoMetadata 가 한 곳에서 하므로 여기서 다시 감싸지 않는다.
  const authored = INSIGHT_SEO_DESCRIPTIONS[article.slug];
  if (authored) return authored;
  return String(article.seoDescription || article.metaDescription || article.description || article.excerpt || article.subtitle || "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);
  const copy = INSIGHT_DETAIL_PAGE_TEXT_TRANSLATIONS.ko;
  if (!article) {
    return buildSeoMetadata({
      path: `/insights/${encodeURIComponent(slug)}`,
      title: copy.fallbackTitle,
      description: copy.fallbackDescription,
      keywords: [copy.fallbackKeyword],
      ogType: "article",
    });
  }

  const image = await getPexelsInsightImage(article).catch(() => getStaticInsightImage(article));
  return buildSeoMetadata({
    path: `/insights/${article.slug}`,
    // 문서 제목은 화면 H1 과 다른 문구를 쓴다 — H1 은 설명적이어야 하고, 문서 제목은 SERP
    // 표시 폭(약 60) 안에 들어와야 한다. 표에 없는 슬러그는 기존 동작(제목 + 접미사)을 그대로 쓴다.
    title: INSIGHT_SEO_TITLES[article.slug] || `${article.title} | ${copy.titleSuffix}`,
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

// 글 카테고리 → 정본 허브. 인사이트 글들은 서로만 링크하고 정작 해당 주제의
// 허브(/sukuyo, /ziwei 등)로는 가지 않아 토픽 클러스터가 닫혀 있었다.
// 허브의 경로·제목은 SEO_LANDING_PAGES 를 그대로 쓴다(별도 목록을 두지 않는다).
const CATEGORY_HUB_KEY = {
  사주: "saju",
  타로: "tarot",
  자미두수: "ziwei",
  점성술: "astrology",
  숙요점: "sukuyo",
  베다점: "vedic",
  궁합: "compatibility",
};

function categoryHub(category) {
  const hubKey = CATEGORY_HUB_KEY[String(category || "").trim()];
  return hubKey ? SEO_LANDING_PAGES[hubKey] || null : null;
}

function normalizeContentHtml(html) {
  return String(html || "")
    .trim()
    .replace(/<h1(\s[^>]*)?>/gi, (_match, attrs = "") => `<h2${attrs}>`)
    .replace(/<\/h1>/gi, "</h2>");
}

export default async function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);
  if (!article) notFound();

  const sections = normalizeSections(article);
  const contentHtml = normalizeContentHtml(article.contentHtml);
  if (sections.length === 0 && !contentHtml) notFound();

  const image = await getPexelsInsightImage(article).catch(() => getStaticInsightImage(article));
  const description = articleDescription(article);
  const related = relatedArticles(article);
  const hub = categoryHub(article.category);
  const articleJsonLd = buildArticleJsonLd({
    title: article.title,
    description,
    path: `/insights/${article.slug}`,
    image: image.src,
    datePublished: article.publishedAt || article.updatedAt,
    dateModified: article.updatedAt || article.publishedAt,
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "꿀꿀 운세 홈", path: "/" },
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
            className="mt-8 rounded-2xl border border-white/10 bg-[#10172b]/85 p-5 text-base leading-8 text-slate-300 md:p-7 [&_a]:text-amber-100 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-amber-100 [&_h2:first-child]:mt-0 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-100 [&_li]:mt-2 [&_p]:mt-4 [&_strong]:text-slate-100 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_table]:mt-6 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm [&_thead]:text-amber-100/90 [&_th]:border [&_th]:border-white/15 [&_th]:bg-white/[0.06] [&_th]:p-3 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-white/10 [&_td]:p-3 [&_td]:align-top"
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

        <ContentIntegrityNote contentSource={article.contentSource} datePublished={article.publishedAt || article.updatedAt} dateModified={article.updatedAt || article.publishedAt} />

        <FusionCrossSell fromPath={`/insights/${slug}`} tone="neo" />

        {hub ? (
          <section className="mt-10 rounded-3xl border border-amber-200/25 bg-amber-100/[0.05] p-5 md:p-7">
            <p className="text-xs font-semibold tracking-[0.18em] text-amber-100/80">이 주제의 기본 안내</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{hub.h1}</h2>
            <Link
              href={hub.path}
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-amber-200/40 bg-amber-100/10 px-5 text-sm font-semibold text-amber-50 transition hover:border-amber-100/70 hover:bg-amber-100/20"
            >
              {hub.h1} 자세히 보기
            </Link>
          </section>
        ) : null}

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
