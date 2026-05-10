"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";
import { sanitizePublicInsightHtml, stripHtmlText } from "../_lib/sanitizePublicHtml";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";

function upsertMetaTag(selector, attrs, content) {
  if (typeof document === "undefined") return;

  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => tag.setAttribute(key, value));
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", String(content || ""));
}

function upsertCanonical(url) {
  if (typeof document === "undefined") return;

  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", String(url || ""));
}

function slugifyHeading(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function enrichHtmlWithToc(rawHtml) {
  if (typeof window === "undefined") {
    return { html: String(rawHtml || ""), toc: [] };
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<article>${String(rawHtml || "")}</article>`, "text/html");
  const article = doc.body.firstElementChild;
  if (!article) return { html: String(rawHtml || ""), toc: [] };

  const toc = [];
  const seen = new Map();
  const headings = article.querySelectorAll("h2, h3");
  headings.forEach((node) => {
    const level = Number(String(node.tagName || "").replace("H", "") || 0);
    const text = String(node.textContent || "").trim();
    if (!text || (level !== 2 && level !== 3)) return;

    const baseId = slugifyHeading(text) || `section-${toc.length + 1}`;
    const count = Number(seen.get(baseId) || 0) + 1;
    seen.set(baseId, count);
    const id = count > 1 ? `${baseId}-${count}` : baseId;

    node.setAttribute("id", id);
    toc.push({ id, text, level });
  });

  const images = article.querySelectorAll("img");
  images.forEach((node) => {
    const loading = String(node.getAttribute("loading") || "").toLowerCase();
    if (loading !== "eager") node.setAttribute("loading", "lazy");
    const alt = String(node.getAttribute("alt") || "").trim();
    if (!alt) node.setAttribute("alt", "본문 이미지");
  });

  return {
    html: article.innerHTML,
    toc,
  };
}

function extractFaqItemsFromHtml(rawHtml) {
  if (typeof window === "undefined") return [];

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<article>${String(rawHtml || "")}</article>`, "text/html");
  const article = doc.body.firstElementChild;
  if (!article) return [];

  const items = [];
  let pendingQuestion = "";
  const blocks = article.querySelectorAll("h2, h3, h4, p, li, dt, dd");

  for (const block of blocks) {
    const text = String(block.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const questionLabel = text.match(/^(질문|Q|Question)\s*[:：]\s*(.+)$/i);
    if (questionLabel) {
      pendingQuestion = String(questionLabel[2] || "").trim();
      continue;
    }

    const answerLabel = text.match(/^(답변|A|Answer)\s*[:：]\s*(.+)$/i);
    if (answerLabel && pendingQuestion) {
      const answer = String(answerLabel[2] || "").trim();
      if (answer) items.push({ question: pendingQuestion, answer });
      pendingQuestion = "";
      continue;
    }

    if (!pendingQuestion && text.endsWith("?")) {
      pendingQuestion = text;
      continue;
    }

    if (pendingQuestion) {
      items.push({ question: pendingQuestion, answer: text });
      pendingQuestion = "";
    }

    if (items.length >= 10) break;
  }

  return items.filter((item) => item.question && item.answer);
}

function resolveSeo(item, shareUrl) {
  const title = String(item?.title || "").trim();
  const subtitle = String(item?.subtitle || "").trim();
  const excerpt = String(item?.excerpt || "").trim();
  const plainBody = stripHtmlText(String(item?.contentHtml || ""));
  const bodySnippet = plainBody.slice(0, 170);

  const metaTitle = String(item?.metaTitle || "").trim() || title;
  const metaDescription = String(item?.metaDescription || "").trim() || excerpt || bodySnippet;
  const ogTitle = String(item?.ogTitle || "").trim() || metaTitle;
  const ogDescription = String(item?.ogDescription || "").trim() || metaDescription;
  const ogImage = String(item?.ogImage || "").trim() || String(item?.featuredImage?.url || "").trim();
  const twitterTitle = String(item?.twitterTitle || "").trim() || ogTitle;
  const twitterDescription = String(item?.twitterDescription || "").trim() || ogDescription;
  const twitterImage = String(item?.twitterImage || "").trim() || ogImage;
  const canonical = String(item?.canonicalUrl || "").trim() || shareUrl;

  return {
    title: subtitle ? `${title} | ${subtitle}` : title,
    metaTitle,
    metaDescription,
    canonical,
    robots: item?.noIndex ? "noindex, nofollow" : "index, follow",
    ogTitle,
    ogDescription,
    ogImage,
    ogType: "article",
    twitterTitle,
    twitterDescription,
    twitterImage,
  };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildShareUrl(rawShareUrl, slug) {
  const safeFromApi = String(rawShareUrl || "").trim();
  if (safeFromApi) return safeFromApi;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/insights/${encodeURIComponent(String(slug || ""))}`;
  }
  return `/insights/${encodeURIComponent(String(slug || ""))}`;
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

      const href = String(item?.href || "").trim();
      const label = String(item?.label || "").trim();
      if (!href || !label) return null;
      return { href, label };
    })
    .filter(Boolean)
    .slice(0, 8);
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
    .slice(0, 8);
}

export default function InsightArticleCosmicClient({
  slug,
  initialItem = null,
  initialRelated = [],
  initialPrevious = null,
  initialNext = null,
}) {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const skipFirstLiveFetchRef = useRef(true);

  const [item, setItem] = useState(initialItem);
  const [related, setRelated] = useState(initialRelated);
  const [previous, setPrevious] = useState(initialPrevious);
  const [next, setNext] = useState(initialNext);

  const [loading, setLoading] = useState(!initialItem);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (skipFirstLiveFetchRef.current && initialItem) {
      skipFirstLiveFetchRef.current = false;
      return () => {
        cancelled = true;
      };
    }

    skipFirstLiveFetchRef.current = false;

    async function loadDetail() {
      setLoading(true);
      setError("");

      try {
        const endpoint = `${apiBase || ""}/api/insights/${encodeURIComponent(String(slug || ""))}`;
        const response = await fetch(endpoint, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String(data?.message || "글을 불러오지 못했습니다."));
        }

        if (cancelled) return;

        setItem(data?.item || null);
        setRelated(Array.isArray(data?.related) ? data.related : []);
        setPrevious(data?.previous || null);
        setNext(data?.next || null);
      } catch (fetchError) {
        if (!cancelled) {
          if (!initialItem) {
            setItem(null);
            setRelated([]);
            setPrevious(null);
            setNext(null);
          }
          setError(String(fetchError?.message || "글을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [apiBase, initialItem, slug]);

  const safeHtml = useMemo(() => sanitizePublicInsightHtml(String(item?.contentHtml || "")), [item?.contentHtml]);
  const tocBundle = useMemo(() => enrichHtmlWithToc(safeHtml), [safeHtml]);
  const renderedHtml = tocBundle.html;
  const tocItems = tocBundle.toc;
  const htmlFaqItems = useMemo(() => extractFaqItemsFromHtml(renderedHtml), [renderedHtml]);
  const dataFaqItems = useMemo(() => normalizeFaqItems(item?.faq), [item?.faq]);
  const faqItems = useMemo(() => {
    const merged = [];
    const seen = new Set();

    for (const faq of [...dataFaqItems, ...htmlFaqItems]) {
      const key = `${faq.question}::${faq.answer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(faq);
      if (merged.length >= 8) break;
    }

    return merged;
  }, [dataFaqItems, htmlFaqItems]);
  const ctaLinks = useMemo(() => {
    const fromCta = normalizeLinkItems(item?.cta?.links);
    if (fromCta.length > 0) return fromCta;
    return normalizeLinkItems(item?.internalLinks);
  }, [item?.cta?.links, item?.internalLinks]);
  const readingTime = Math.max(1, Number(item?.readingTime || 0) || 1);
  const shareUrl = buildShareUrl(item?.shareUrl, item?.slug || slug);
  const seo = useMemo(() => resolveSeo(item, shareUrl), [item, shareUrl]);
  const breadcrumbJsonLd = useMemo(
    () =>
      buildBreadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "운세 인사이트 허브", path: "/insights" },
        { name: String(item?.title || "인사이트 상세"), path: `/insights/${encodeURIComponent(String(item?.slug || slug || ""))}` },
      ]),
    [item?.slug, item?.title, slug],
  );

  const blogPostingSchema = useMemo(() => {
    if (!item) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: String(item?.title || ""),
      description: String(seo.metaDescription || ""),
      image: seo.ogImage || undefined,
      author: {
        "@type": "Person",
        name: String(item?.author || "꽃돼지 연이"),
      },
      publisher: {
        "@type": "Organization",
        name: "Code Destiny",
        logo: {
          "@type": "ImageObject",
          url: "https://code-destiny.com/icons/꿀꿀 운세 로고.webp",
        },
      },
      datePublished: item?.publishedAt || item?.createdAt || undefined,
      dateModified: item?.updatedAt || undefined,
      mainEntityOfPage: seo.canonical,
    };
  }, [item, seo.canonical, seo.metaDescription, seo.ogImage]);

  const faqSchema = useMemo(() => {
    if (!Array.isArray(faqItems) || faqItems.length === 0) return null;
    return buildFaqPageJsonLd(faqItems);
  }, [faqItems]);

  useEffect(() => {
    if (!item) return;

    document.title = seo.metaTitle || seo.title || "인사이트";
    upsertMetaTag('meta[name="description"]', { name: "description" }, seo.metaDescription);
    upsertCanonical(seo.canonical);
    upsertMetaTag('meta[name="robots"]', { name: "robots" }, seo.robots);
    upsertMetaTag('meta[property="og:title"]', { property: "og:title" }, seo.ogTitle);
    upsertMetaTag('meta[property="og:description"]', { property: "og:description" }, seo.ogDescription);
    upsertMetaTag('meta[property="og:image"]', { property: "og:image" }, seo.ogImage);
    upsertMetaTag('meta[property="og:type"]', { property: "og:type" }, seo.ogType);
    upsertMetaTag('meta[property="og:url"]', { property: "og:url" }, seo.canonical);
    upsertMetaTag('meta[name="twitter:title"]', { name: "twitter:title" }, seo.twitterTitle);
    upsertMetaTag('meta[name="twitter:description"]', { name: "twitter:description" }, seo.twitterDescription);
    upsertMetaTag('meta[name="twitter:image"]', { name: "twitter:image" }, seo.twitterImage);
    upsertMetaTag('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  }, [item, seo]);

  function onTocClick(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  }

  async function onShare() {
    if (!item) return;

    const title = String(item?.title || "인사이트 글");
    const text = String(item?.excerpt || stripHtmlText(item?.contentHtml || "")).slice(0, 140);

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        setShareMessage("공유창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("링크를 복사했습니다.");
    } catch {
      setShareMessage("공유를 완료하지 못했습니다.");
    }
  }

  if (loading) {
    return <div className="mx-auto w-full max-w-4xl px-4 py-16 text-sm text-slate-300">인사이트를 불러오는 중...</div>;
  }

  if (error || !item) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 space-y-4">
        <p className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error || "존재하지 않거나 비공개 상태의 글입니다."}</p>
        <Link href="/insights" className="inline-flex rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10">목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2a1a47_0%,#100a1f_45%,#090612_100%)] text-slate-100">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10 space-y-6">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-300">
          <Link href="/" className="hover:text-amber-100">홈</Link>
          <span>{" > "}</span>
          <Link href="/insights" className="hover:text-amber-100">운세 인사이트 허브</Link>
          <span>{" > "}</span>
          <span className="text-slate-100">{item.title}</span>
        </nav>

        <Link href="/insights" className="inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">목록으로 돌아가기</Link>

        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
          <p className="text-xs text-amber-200/85">{item.category || "인사이트"}</p>
          <h1 className="mt-2 text-2xl md:text-4xl font-semibold leading-tight text-amber-50">{item.title}</h1>
          {item.subtitle ? <p className="mt-3 text-base text-slate-300 leading-7">{item.subtitle}</p> : null}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            <span>작성일 {formatDateTime(item.publishedAt || item.createdAt)}</span>
            <span>수정일 {formatDateTime(item.updatedAt)}</span>
            <span>조회 {Number(item.viewCount || 0).toLocaleString("ko-KR")}</span>
            <span>약 {readingTime}분 읽기</span>
          </div>

          {item.noIndex ? (
            <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              이 글은 검색 색인 제외(noIndex) 설정이 켜져 있습니다.
            </p>
          ) : null}

          {item.featuredImage?.url ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={item.featuredImage.url}
                alt={item.featuredImage.alt || item.title}
                loading="lazy"
                width={item.featuredImage.width || undefined}
                height={item.featuredImage.height || undefined}
                className="w-full h-auto object-cover"
              />
            </div>
          ) : null}

          {Array.isArray(item.tags) && item.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((value) => (
                <span key={`${item.slug}-${value}`} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">#{value}</span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onShare}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              공유하기
            </button>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(item.title)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              X 공유
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Facebook 공유
            </a>
            {shareMessage ? <span className="text-xs text-emerald-300">{shareMessage}</span> : null}
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-amber-100">목차</h2>
            <button
              type="button"
              className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-slate-200 md:hidden"
              onClick={() => setTocOpen((open) => !open)}
            >
              {tocOpen ? "접기" : "펼치기"}
            </button>
          </div>

          {tocItems.length > 0 ? (
            <nav className={`${tocOpen ? "block" : "hidden"} md:block mt-3`} aria-label="본문 목차">
              <ul className="space-y-1.5">
                {tocItems.map((toc) => (
                  <li key={toc.id} className={toc.level === 3 ? "pl-4" : ""}>
                    <button
                      type="button"
                      onClick={() => onTocClick(toc.id)}
                      className="text-left text-sm text-slate-200 hover:text-amber-100 leading-6"
                    >
                      {toc.level === 3 ? "- " : ""}{toc.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <p className="mt-3 text-xs text-slate-400">목차를 생성할 h2/h3가 없습니다.</p>
          )}
        </section>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-6 md:px-8 md:py-8">
          <div className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:text-amber-50 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-li:leading-8 prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-blockquote:border-amber-300/40 prose-blockquote:text-slate-200" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </article>

        {ctaLinks.length > 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-6 md:px-8 md:py-8">
            <h2 className="text-xl font-semibold text-amber-100">관련 서비스 바로가기</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              검색으로 들어온 내용을 기능 실행으로 이어가야 해석의 가치가 커집니다. 아래 키워드 앵커로 바로 이동해 보세요.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {ctaLinks.map((linkItem) => (
                <Link
                  key={`${item.slug}-${linkItem.href}-${linkItem.label}`}
                  href={linkItem.href}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
                >
                  {linkItem.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {faqItems.length > 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-6 md:px-8 md:py-8">
            <h2 className="text-xl font-semibold text-amber-100">자주 묻는 질문</h2>
            <div className="mt-4 space-y-3">
              {faqItems.map((faq) => (
                <article key={`${faq.question}-${faq.answer.slice(0, 20)}`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-100">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{faq.answer}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-400">
              본 콘텐츠는 오락 및 자기이해를 돕는 참고 정보이며, 의료·법률·투자 판단을 대체하지 않습니다.
            </p>
          </section>
        ) : null}

        {(previous || next) ? (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-slate-400">이전 글</p>
              {previous ? (
                <Link href={`/insights/${previous.slug}`} className="mt-2 block text-sm font-semibold text-slate-100 hover:text-amber-100">{previous.title}</Link>
              ) : (
                <p className="mt-2 text-sm text-slate-500">이전 글이 없습니다.</p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-slate-400">다음 글</p>
              {next ? (
                <Link href={`/insights/${next.slug}`} className="mt-2 block text-sm font-semibold text-slate-100 hover:text-amber-100">{next.title}</Link>
              ) : (
                <p className="mt-2 text-sm text-slate-500">다음 글이 없습니다.</p>
              )}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-amber-100">관련 글</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {related.map((rel) => (
                <Link key={`rel-${rel.slug}`} href={`/insights/${rel.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-amber-300/40 transition">
                  <p className="text-xs text-slate-400">{rel.category || "인사이트"} · {formatDateTime(rel.publishedAt)}</p>
                  <h3 className="mt-2 text-sm font-semibold text-slate-100 leading-6">{rel.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {blogPostingSchema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        {faqSchema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        ) : null}
      </section>
    </main>
  );
}
