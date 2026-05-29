import { INSIGHT_ARTICLES } from "./articles";
import { SEO_GROWTH_ARTICLES } from "./seo-growth-articles";

const DEFAULT_AUTHOR = "Code Destiny Editorial Team";
const SITE_ORIGIN = "https://code-destiny.com";
const DEFAULT_FEATURED_IMAGE = "/icons/꿀꿀 운세 로고.webp";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${DEFAULT_FEATURED_IMAGE}`;

const INSIGHT_IMAGE_PROFILES = [
  {
    id: "ziwei",
    url: "/fuctionassets/jami.webp",
    alt: "자미두수 명반 인사이트 이미지",
    keywords: ["자미", "ziwei", "명궁", "12궁", "궁위", "사화", "자미두수"],
  },
  {
    id: "sukuyo",
    url: "/fuctionassets/sukyo.webp",
    alt: "숙요점 궁합 인사이트 이미지",
    keywords: ["숙요", "27숙", "영친", "업태", "안괴", "본명숙", "월명숙"],
  },
  {
    id: "saju",
    url: "/fuctionassets/saju.webp",
    alt: "사주 명리학 인사이트 이미지",
    keywords: ["사주", "명리", "천간", "지지", "오행", "십성", "용신", "만세력", "일간", "대운", "세운"],
  },
  {
    id: "tarot-major",
    url: "/tarot-cards/theworld.webp",
    alt: "타로 메이저 아르카나 인사이트 이미지",
    keywords: ["아르카나", "major", "arcana", "메이저", "카드"],
  },
  {
    id: "tarot",
    url: "/fuctionassets/tarolove.webp",
    alt: "타로 리딩 인사이트 이미지",
    keywords: ["타로", "tarot", "스프레드", "리딩", "역방향"],
  },
  {
    id: "astrology",
    url: "/fuctionassets/jumsung.webp",
    alt: "점성술 차트 인사이트 이미지",
    keywords: ["점성", "astrology", "태양궁", "달궁", "상승궁", "하우스", "출생차트"],
  },
  {
    id: "vedic",
    url: "/fuctionassets/veda.webp",
    alt: "베다점성술 인사이트 이미지",
    keywords: ["베다", "vedic", "라그나", "나크샤트라"],
  },
  {
    id: "dream",
    url: "/fuctionassets/heamong.webp",
    alt: "꿈해몽 인사이트 이미지",
    keywords: ["꿈", "dream", "해몽", "무의식"],
  },
  {
    id: "love",
    url: "/fuctionassets/lovebible.webp",
    alt: "연애 궁합 인사이트 이미지",
    keywords: ["연애", "궁합", "관계", "재회", "사랑", "속마음"],
  },
  {
    id: "general",
    url: "/fuctionassets/flower4.webp",
    alt: "운세 인사이트 이미지",
    keywords: ["운세", "인사이트", "가이드", "fortune"],
  },
];

function isKnownBrokenImageUrl(value) {
  const url = String(value || "").trim().toLowerCase();
  if (!url) return true;
  return url.includes("/og/code-destiny-og.png");
}

function toAbsoluteAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return `${SITE_ORIGIN}/${raw}`;
}

function pickTopicImageProfile(article, index) {
  const blob = [
    article?.slug,
    article?.title,
    article?.description,
    article?.category,
    article?.mainKeyword,
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
    ...(Array.isArray(article?.relatedKeywords) ? article.relatedKeywords : []),
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  let bestScore = 0;
  const bestProfiles = [];

  for (const profile of INSIGHT_IMAGE_PROFILES) {
    let score = 0;
    for (const keyword of profile.keywords) {
      if (blob.includes(String(keyword || "").toLowerCase())) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProfiles.length = 0;
      bestProfiles.push(profile);
    } else if (score > 0 && score === bestScore) {
      bestProfiles.push(profile);
    }
  }

  if (bestProfiles.length > 0) {
    return bestProfiles[Math.abs(index) % bestProfiles.length];
  }

  return INSIGHT_IMAGE_PROFILES.find((profile) => profile.id === "general") || INSIGHT_IMAGE_PROFILES[0];
}

function resolveSeedImage(article, index, title) {
  const explicitImageUrl = String(
    article?.thumbnailUrl
      || article?.featuredImage?.url
      || article?.heroImage
      || article?.image
      || "",
  ).trim();

  const profile = pickTopicImageProfile(article, index);
  const selectedUrl = !isKnownBrokenImageUrl(explicitImageUrl) ? explicitImageUrl : profile.url;
  const selectedAlt = String(article?.featuredImage?.alt || profile.alt || `${title} 대표 이미지`).trim();

  return {
    url: selectedUrl || DEFAULT_FEATURED_IMAGE,
    alt: selectedAlt || `${title} 대표 이미지`,
    width: Math.max(0, Number(article?.featuredImage?.width || 1200) || 1200),
    height: Math.max(0, Number(article?.featuredImage?.height || 630) || 630),
  };
}

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

function inferCategoryLabel(article) {
  const bag = [
    article?.category,
    article?.title,
    article?.slug,
    article?.mainKeyword,
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
  ].map((value) => String(value || "")).join(" ").toLowerCase();

  if (/자미|ziwei|명궁|궁위/.test(bag)) return "자미두수";
  if (/숙요|27숙|영친|업태|안괴/.test(bag)) return "숙요점";
  if (/타로|arcan|스프레드|카드/.test(bag)) return "타로";
  if (/베다|vedic|라그나|나크샤트라|다샤/.test(bag)) return "베다점";
  if (/점성|astrology|태양궁|상승궁|하우스/.test(bag)) return "점성술";
  if (/궁합|compatibility|연애/.test(bag)) return "궁합";
  if (/오늘|daily/.test(bag)) return "오늘의 운세";
  if (/신년|new\s*year|yearly/.test(bag)) return "신년운세";
  if (/룬|rune/.test(bag)) return "룬";
  if (/오미쿠지|omikuji/.test(bag)) return "오미쿠지";
  if (/사주|명리|오행|십성|대운|일간/.test(bag)) return "사주";
  return "기타";
}

function normalizeTags(article) {
  const categoryLabel = inferCategoryLabel(article);
  const seedTags = [
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
    ...(Array.isArray(article?.relatedKeywords) ? article.relatedKeywords : []),
    categoryLabel,
    String(article?.mainKeyword || "").trim(),
  ];

  const tags = seedTags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const unique = Array.from(new Set(tags));

  if (unique.length < 3) {
    if (categoryLabel === "사주") unique.push("오행", "대운", "재물운");
    if (categoryLabel === "자미두수") unique.push("명궁", "궁위", "관록궁");
    if (categoryLabel === "숙요점") unique.push("27숙", "영친", "관계 흐름");
    if (categoryLabel === "타로") unique.push("카드 리딩", "질문 설계", "감정 흐름");
    if (categoryLabel === "점성술") unique.push("출생차트", "상승궁", "하우스");
    if (categoryLabel === "베다점") unique.push("라그나", "다샤", "카르마");
  }

  return Array.from(new Set(unique)).slice(0, 7);
}

function resolveServiceLink(categoryLabel) {
  if (categoryLabel === "사주") return "/saju/basic";
  if (categoryLabel === "자미두수") return "/ziwei";
  if (categoryLabel === "숙요점") return "/compatibility";
  if (categoryLabel === "타로") return "/tarot";
  if (categoryLabel === "점성술") return "/astrology";
  if (categoryLabel === "베다점") return "/vedic";
  if (categoryLabel === "오늘의 운세") return "/daily-fortune";
  if (categoryLabel === "궁합") return "/compatibility";
  return "/insights";
}

function resolveCtaLabel(categoryLabel) {
  if (categoryLabel === "사주") return "내 사주에서 이 흐름을 직접 확인하기";
  if (categoryLabel === "자미두수") return "내 명반에서 이 궁의 신호를 확인하기";
  if (categoryLabel === "숙요점") return "두 사람의 숙요 인연을 깊게 보기";
  if (categoryLabel === "타로") return "지금 질문으로 타로 리딩 시작하기";
  if (categoryLabel === "점성술") return "내 차트가 말하는 사랑과 일을 살펴보기";
  if (categoryLabel === "베다점") return "반복되는 주기를 베다 차트로 확인하기";
  if (categoryLabel === "오늘의 운세") return "오늘 밀어붙일 타이밍 확인하기";
  if (categoryLabel === "궁합") return "우리 관계의 리듬을 궁합으로 읽어보기";
  return "관련 운세 서비스로 이어보기";
}

function buildMysticExcerpt(article, categoryLabel) {
  const keyword = String(article?.mainKeyword || article?.title || categoryLabel || "운세").trim();
  const candidate = `${keyword}의 신호는 이미 일상에서 반복되고 있습니다. 상담 현장에서 바로 쓰는 해석 순서로, 관계·돈·직업·마음의 흐름을 한 장면처럼 읽어드립니다.`;
  return candidate.slice(0, 158);
}

function buildMysticSections(article, categoryLabel, tags) {
  const title = String(article?.title || "운세 인사이트").trim();
  const key = String(article?.mainKeyword || tags[0] || categoryLabel || "운세").trim();

  const s1 = `${title}를 자주 찾는 사람은 대개 같은 지점에서 멈춥니다. 눈앞의 사건은 달라 보여도, 마음속 질문은 놀라울 만큼 닮아 있습니다. 왜 이 일이 반복되는지, 왜 비슷한 사람에게 끌리는지, 왜 중요한 결정 앞에서 같은 불안을 겪는지입니다. 실제 상담에서는 이 반복의 결을 먼저 읽습니다. ${key}는 미래를 겁주기 위한 도구가 아니라, 오늘의 선택을 선명하게 만드는 지도입니다.`;
  const s2 = `실전 해석은 이론을 길게 늘어놓지 않습니다. 먼저 현재의 고민이 어디에서 시작되었는지 짚고, 다음으로 관계와 돈, 일의 축이 어디에서 서로 엉키는지 확인합니다. ${categoryLabel} 상담에서도 순서는 같습니다. 중심축 하나를 정하고 주변 신호를 붙여 읽으면, 막연했던 불안이 행동 가능한 문장으로 바뀝니다. 이 순서를 익히면 중요한 선택 앞에서 흔들리는 시간이 확실히 줄어듭니다.`;
  const s3 = `초보자가 가장 자주 착각하는 지점은 ‘좋은 신호냐, 나쁜 신호냐’만 빨리 판정하려는 태도입니다. 그러나 오래 보는 사람은 길흉보다 대가와 보상을 함께 봅니다. 어떤 흐름은 당장 편하지만 오래가며 비용이 커지고, 어떤 흐름은 시작이 낯설어도 시간이 지나 힘이 됩니다. 그래서 상담에서는 단정 대신 조건을 함께 제시합니다. 무엇을 줄이면 열리고, 무엇을 과하게 밀면 닫히는지까지 함께 말해줘야 현실에서 쓸 수 있습니다.`;
  const s4 = `이 신호가 강할 때 현실에는 몇 가지 장면이 반복됩니다. 관계에서는 말하지 않은 기대가 커져 오해가 쌓이고, 돈에서는 조급한 선택이 누적되어 지출 패턴이 흔들립니다. 일에서는 방향은 맞지만 리듬이 틀려 성과가 늦게 드러나기도 합니다. 마음에서는 ‘내가 틀렸나’라는 자기 의심이 조용히 커집니다. 이때 필요한 것은 더 많은 정보가 아니라, 우선순위를 다시 세우는 단호한 기준입니다.`;
  const s5 = `활용법은 어렵지 않습니다. 관계에서는 한 문장 확인 질문을 먼저 두고, 돈에서는 결정 전 하루를 비워 감정 속도를 낮추며, 직업에서는 이번 주 한 가지 성과 지표만 선명하게 고정합니다. 마음이 흔들릴 때는 원인 분석보다 회복 리듬을 먼저 붙잡는 편이 훨씬 빠릅니다. 이런 작은 규칙이 쌓이면 운은 갑자기 바뀌는 것이 아니라, 내가 버틸 수 있는 방향으로 조용히 이동합니다.`;
  const s6 = `지금 당신의 흐름도 같은 방식으로 읽을 수 있습니다. 단편적인 키워드가 아니라 실제 고민의 장면에 맞춰 해석하면, 다음 한 걸음이 분명해집니다. 아래 연결된 서비스에서 ${categoryLabel} 기반 흐름을 직접 확인해 보세요. 글에서 읽은 신호를 내 이야기로 바꾸는 순간, 운세는 정보가 아니라 선택의 힘이 됩니다.`;

  return [
    { heading: "왜 이 주제가 중요한가", body: s1 },
    { heading: "실제 상담에서는 어디를 먼저 보는가", body: s2 },
    { heading: "초보자가 가장 많이 착각하는 부분", body: s3 },
    { heading: "이 신호가 강할 때 현실에서 나타나는 모습", body: s4 },
    { heading: "관계·돈·직업·마음에서 활용하는 법", body: s5 },
    { heading: "관련 운세 서비스로 이어지는 안내", body: s6 },
  ];
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
  const resolvedImage = resolveSeedImage(article, index, title);
  const category = inferCategoryLabel(article);
  const tags = normalizeTags(article);
  const rewrittenSections = buildMysticSections(article, category, tags);
  const contentHtml = `<article><h1>${escapeHtml(title)}</h1>${renderSectionsToHtml(rewrittenSections)}</article>`;
  const excerpt = buildMysticExcerpt(article, category);
  const description = excerpt;
  const author =
    typeof article?.author === "object" && article?.author
      ? String(article.author.name || DEFAULT_AUTHOR)
      : DEFAULT_AUTHOR;

  const publishedAt = normalizeIsoDate(article?.updatedAt, 120 + index);
  const updatedAt = normalizeIsoDate(article?.updatedAt || article?.publishedAt, 30 + index);
  const internalLinks = normalizeLinkItems(article?.internalLinks);
  const faq = normalizeFaqItems(article?.faq);
  const ctaLinks = normalizeLinkItems(article?.cta?.links);
  const ctaServiceRoute = String(article?.ctaServiceRoute || article?.targetRoute || internalLinks?.[0]?.href || resolveServiceLink(category)).trim();
  const ctaLabel = resolveCtaLabel(category);
  const normalizedCtaLinks = ctaLinks.length > 0
    ? ctaLinks
    : (internalLinks.length > 0 ? internalLinks : [{ href: ctaServiceRoute || "/insights", label: ctaLabel }]);

  const seoTitle = String(article?.metaTitle || article?.seoTitle || `${title} — 운명의 흐름을 읽는 실전 해석`).trim();
  const seoDescription = String(article?.metaDescription || article?.seoDescription || excerpt).trim().slice(0, 160);

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
    seoTitle,
    seoDescription,
    serviceLink: ctaServiceRoute,
    ctaLabel,
    ogImage: toAbsoluteAssetUrl(
      !isKnownBrokenImageUrl(article?.ogImage)
        ? String(article?.ogImage || "").trim()
        : resolvedImage.url,
    ) || DEFAULT_OG_IMAGE,
    internalLinks,
    faq,
    ctaServiceRoute,
    cta: {
      title: String(article?.cta?.title || ctaLabel).trim(),
      links: normalizedCtaLinks,
    },
    relatedPosts: Array.isArray(article?.relatedPosts)
      ? article.relatedPosts.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 12)
      : [],
    featuredImage: resolvedImage,
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
