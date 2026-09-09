import Link from "next/link";
import { notFound } from "next/navigation";
import { INSIGHT_SEED_ARTICLES, getInsightSeedBySlug, getInsightSeedRelated } from "../seed-articles";
import { getTopicKey } from "../articles";
import { ZIWEI_READING_ORDER } from "../ziwei-reading-order";
import { INSIGHT_SEO_TITLES } from "../seo-titles";
import { INSIGHT_SEO_DESCRIPTIONS } from "../seo-descriptions";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "../../../lib/structured-data";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { FusionCrossSell } from "../../components/FusionCrossSell";
import styles from "../insight-article.module.css";

export const dynamic = "force-static";
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
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "");
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

  const image = getStaticInsightImage(article);
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
  if (getTopicKey(article) === "ziwei") {
    const neighborSlugs = readingNeighbors(article);
    const orderedNeighbors = [neighborSlugs.previous, neighborSlugs.next].filter(Boolean);
    const sameTopic = INSIGHT_SEED_ARTICLES.filter(
      (item) => item.slug !== article.slug && getTopicKey(item) === "ziwei",
    );
    const relatedBySlug = new Map([...orderedNeighbors, ...sameTopic].map((item) => [item.slug, item]));
    return Array.from(relatedBySlug.values()).slice(0, 6);
  }
  return getInsightSeedRelated(article.slug, 6);
}

function readingNeighbors(article) {
  if (getTopicKey(article) !== "ziwei") return { previous: null, next: null, position: null, total: null };
  const index = ZIWEI_READING_ORDER.indexOf(article.slug);
  if (index < 0) return { previous: null, next: null, position: null, total: null };
  return {
    previous: getInsightSeedBySlug(ZIWEI_READING_ORDER[index - 1]),
    next: getInsightSeedBySlug(ZIWEI_READING_ORDER[index + 1]),
    position: index + 1,
    total: ZIWEI_READING_ORDER.length,
  };
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
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "");
  const article = getInsightSeedBySlug(slug);
  if (!article) notFound();

  const sections = normalizeSections(article);
  const contentHtml = normalizeContentHtml(article.contentHtml);
  if (sections.length === 0 && !contentHtml) notFound();

  const image = getStaticInsightImage(article);
  const description = articleDescription(article);
  const related = relatedArticles(article);
  const neighbors = readingNeighbors(article);
  const hub = categoryHub(article.category);
  const articleJsonLd = buildArticleJsonLd({
    title: article.title,
    description,
    path: `/insights/${article.slug}`,
    image: image.src,
    author: article.author,
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || undefined,
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "꿀꿀 운세 홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: article.title, path: `/insights/${article.slug}` },
  ]);

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <nav className={styles.breadcrumb} aria-label="인사이트 위치">
          <Link href="/insights" className={styles.backLink}>← 운세 인사이트</Link>
          <span aria-hidden="true">·</span>
          <span>자미두수 비교 읽기</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.metaRow}>
              <span>{article.category || "운세 인사이트"}</span>
              <span aria-hidden="true">·</span>
              <span>차분한 비교 읽기</span>
            </div>
            <h1>{article.title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
            <div className={styles.tags} aria-label="관련 주제">
              {(article.tags || article.keywords || []).slice(0, 10).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
          <figure className={styles.heroVisual}>
            <img src={image.src} alt={image.alt || `${article.title} 대표 이미지`} width="1600" height="900" />
            <figcaption className={styles.pigNote}>
              <img src="/icons/app-logo-512.webp" alt="" width="512" height="512" />
              <span>꽃돼지가 비교 기준을 안내할게요.</span>
            </figcaption>
          </figure>
        </header>

        <div className={styles.readingLead}>
          <h2>이 글을 읽는 순서</h2>
          <p>두 체계를 어느 쪽이 더 맞는지 겨루기보다, 어떤 질문에 어떤 지도가 도움이 되는지 차분히 비교해 보세요.</p>
        </div>

        {contentHtml ? (
          <section className={styles.prose} dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <section className={styles.sectionStack}>
            {sections.map((section, index) => (
              <section key={`${section.heading}-${index}`} className={styles.sectionCard}>
                {section.heading ? <h2>{section.heading}</h2> : null}
                {section.body ? <p>{section.body}</p> : null}
              </section>
            ))}
          </section>
        )}

        {neighbors.total ? (
          <nav className={styles.readingNav} aria-label="자미두수 인사이트 읽기 순서">
            <div className={styles.sectionHeading}>
              <div>
                <h2>자미두수 인사이트 읽기</h2>
                <p>앞 글을 읽었다면 다음 주제로 이어가거나, 허브에서 전체 순서를 다시 볼 수 있습니다.</p>
              </div>
              <span>{neighbors.position} / {neighbors.total}</span>
            </div>
            <div className={styles.neighborGrid}>
              {neighbors.previous ? (
                <Link href={`/insights/${neighbors.previous.slug}`} className={styles.neighborLink}>
                  <span>이전 글</span>
                  <strong>{neighbors.previous.title}</strong>
                </Link>
              ) : <span className={styles.neighborEmpty}>첫 번째 읽기 글입니다.</span>}
              {neighbors.next ? (
                <Link href={`/insights/${neighbors.next.slug}`} className={`${styles.neighborLink} ${styles.nextLink}`}>
                  <span>다음 글</span>
                  <strong>{neighbors.next.title}</strong>
                </Link>
              ) : <span className={`${styles.neighborEmpty} ${styles.nextLink}`}>읽기 순서의 마지막 글입니다.</span>}
            </div>
            <Link href="/insights/ziwei" className={styles.pillLink}>자미두수 인사이트 전체 보기</Link>
          </nav>
        ) : null}

        <ContentIntegrityNote
          contentPath={`/insights/${slug}`}
          contentSource={article.contentSource}
          author={article.author}
          datePublished={article.publishedAt}
          dateModified={article.updatedAt}
          tone="light"
          className={styles.integrityNote}
        />

        <FusionCrossSell fromPath={`/insights/${slug}`} tone="yeoni" />

        {hub ? (
          <section className={styles.hubCard}>
            <h2>{hub.h1}</h2>
            <p>이 주제의 기본 안내에서 핵심 개념과 해석 기준을 더 살펴보세요.</p>
            <Link href={hub.path} className={styles.pillLink}>{hub.h1} 자세히 보기</Link>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className={styles.relatedSection}>
            <h2>함께 보면 좋은 인사이트</h2>
            <div className={styles.relatedGrid}>
              {related.map((item) => (
                <Link key={item.slug} href={`/insights/${item.slug}`} className={styles.relatedLink}>
                  <span>{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{articleDescription(item)}</p>
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
