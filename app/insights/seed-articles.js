import { INSIGHT_ARTICLES } from "./articles";
import { SEO_GROWTH_ARTICLES } from "./seo-growth-articles";

const DEFAULT_AUTHOR = "Code Destiny Editorial Team";
const DEFAULT_OG_IMAGE = "https://code-destiny.com/og/code-destiny-og.png";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeIsoDate(rawDate, fallbackOffsetDays = 0) {
  const candidate = String(rawDate || "").trim();
  if (candidate) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const fallback = new Date(Date.now() - fallbackOffsetDays * 86400000);
  return fallback.toISOString();
}

function renderSectionsToHtml(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return "";

  return sections
    .map((section) => {
      const heading = escapeHtml(section?.heading || "핵심 포인트");
      const body = escapeHtml(section?.body || "").replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
      return `<section><h2>${heading}</h2><p>${body}</p></section>`;
    })
    .join("\n");
}

function buildExcerpt(article) {
  const description = String(article?.description || "").trim();
  if (description) return description;

  const firstSection = Array.isArray(article?.sections) ? article.sections[0] : null;
  const sectionBody = String(firstSection?.body || "").replace(/\s+/g, " ").trim();
  return sectionBody.slice(0, 220);
}

function normalizeTags(article) {
  const tags = Array.isArray(article?.keywords) ? article.keywords : [];
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeLinkItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string") {
        const href = String(item || "").trim();
        if (!href) return null;
        return { href, label: href };
      }

      const href = String(item.href || "").trim();
      const label = String(item.label || "").trim();
      if (!href || !label) return null;
      return { href, label };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeFaqItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const question = String(item?.question || "").trim();
      const answer = String(item?.answer || "").trim();
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean)
    .slice(0, 10);
}

function buildSeedArticle(article, index) {
  const slug = String(article?.slug || "").trim();
  const title = String(article?.title || "운세 인사이트").trim();
  const description = String(article?.description || buildExcerpt(article)).trim();
  const excerpt = buildExcerpt(article);
  const category = String(article?.category || "운세 인사이트").trim();
  const tags = normalizeTags(article);
  const author =
    typeof article?.author === "object" && article?.author
      ? String(article.author.name || DEFAULT_AUTHOR)
      : DEFAULT_AUTHOR;

  const publishedAt = normalizeIsoDate(article?.updatedAt, 120 + index);
  const updatedAt = normalizeIsoDate(article?.updatedAt || article?.publishedAt, 30 + index);
  const contentHtml = renderSectionsToHtml(article?.sections);
  const internalLinks = normalizeLinkItems(article?.internalLinks);
  const faq = normalizeFaqItems(article?.faq);
  const ctaLinks = normalizeLinkItems(article?.cta?.links);
  const ctaServiceRoute = String(article?.ctaServiceRoute || article?.targetRoute || internalLinks?.[0]?.href || "/insights").trim();

  return {
    slug,
    title,
    subtitle: String(article?.subtitle || "").trim(),
    intro: String(article?.intro || "").trim(),
    description,
    excerpt,
    category,
    mainKeyword: String(article?.mainKeyword || tags?.[0] || title).trim(),
    relatedKeywords: Array.isArray(article?.relatedKeywords)
      ? article.relatedKeywords.map((keyword) => String(keyword || "").trim()).filter(Boolean).slice(0, 12)
      : tags.slice(1, 12),
    searchIntent: String(article?.searchIntent || "운세 주제의 핵심 개념을 이해하고 관련 기능으로 연결하려는 정보 탐색 의도").trim(),
    targetRoute: String(article?.targetRoute || ctaServiceRoute || "/insights").trim(),
    pageType: String(article?.pageType || "insight").trim(),
    tags,
    author,
    publishedAt,
    updatedAt,
    createdAt: publishedAt,
    viewCount: Math.max(0, 1200 - index * 7),
    readingTime: Math.max(4, Math.ceil(contentHtml.replace(/<[^>]+>/g, " ").length / 520)),
    noIndex: false,
    isFeatured: index < 12,
    canonicalUrl: `https://code-destiny.com/insights/${encodeURIComponent(slug)}`,
    ogImage: DEFAULT_OG_IMAGE,
    internalLinks,
    faq,
    ctaServiceRoute,
    cta: {
      title: String(article?.cta?.title || "관련 서비스 바로 시작하기").trim(),
      links: ctaLinks.length > 0 ? ctaLinks : internalLinks,
    },
    relatedPosts: Array.isArray(article?.relatedPosts)
      ? article.relatedPosts.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 12)
      : [],
    featuredImage: {
      url: DEFAULT_OG_IMAGE,
      alt: `${title} 대표 이미지`,
      width: 1200,
      height: 630,
    },
    contentHtml,
  };
}

const MERGED_INSIGHT_ARTICLES = [...SEO_GROWTH_ARTICLES, ...INSIGHT_ARTICLES];

export const INSIGHT_SEED_ARTICLES = Array.from(
  new Map(
    MERGED_INSIGHT_ARTICLES
      .filter((article) => String(article?.slug || "").trim())
      .map((article) => [String(article.slug).trim().toLowerCase(), article]),
  ).values(),
)
  .map(buildSeedArticle)
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export function getInsightSeedBySlug(slug) {
  const safeSlug = String(slug || "").trim().toLowerCase();
  if (!safeSlug) return null;
  return INSIGHT_SEED_ARTICLES.find((article) => article.slug === safeSlug) || null;
}

export function getInsightSeedRelated(slug, limit = 6) {
  const current = getInsightSeedBySlug(slug);
  if (!current) return INSIGHT_SEED_ARTICLES.slice(0, limit);

  const sameCategory = INSIGHT_SEED_ARTICLES.filter(
    (article) => article.slug !== current.slug && article.category === current.category,
  );
  const sameTag = INSIGHT_SEED_ARTICLES.filter(
    (article) =>
      article.slug !== current.slug
      && article.tags.some((tag) => current.tags.includes(tag))
      && article.category !== current.category,
  );

  return [...sameCategory, ...sameTag].slice(0, limit);
}

export function getInsightSeedPrevNext(slug) {
  const idx = INSIGHT_SEED_ARTICLES.findIndex((article) => article.slug === slug);
  if (idx < 0) return { previous: null, next: null };

  return {
    previous: INSIGHT_SEED_ARTICLES[idx - 1] || null,
    next: INSIGHT_SEED_ARTICLES[idx + 1] || null,
  };
}

export function getInsightSeedFilters() {
  const categories = Array.from(new Set(INSIGHT_SEED_ARTICLES.map((article) => article.category))).filter(Boolean);
  const tags = Array.from(new Set(INSIGHT_SEED_ARTICLES.flatMap((article) => article.tags || []))).filter(Boolean);

  return {
    categories: categories.sort((a, b) => a.localeCompare(b, "ko")),
    tags: tags.sort((a, b) => a.localeCompare(b, "ko")).slice(0, 120),
  };
}
