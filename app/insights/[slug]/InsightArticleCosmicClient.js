"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import ServiceCTA from "../../components/ServiceCTA";
import Breadcrumb from "../../components/Breadcrumb";

const SECTION_ACCENTS = ["#c9a84c", "#4ecdc4", "#a78bfa", "#ff6b9d", "#60a5fa"];

function getSectionAccent(index) {
  return SECTION_ACCENTS[index % SECTION_ACCENTS.length];
}

function buildTarotImageUrl(cardId) {
  const safeId = String(cardId || "").trim();
  if (!safeId) return "";
  return `/api/tarot/card-image/${encodeURIComponent(safeId)}`;
}

export default function InsightArticleCosmicClient({ article, topic, relatedArticles }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      rafId = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) {
        scrollProgressRef.current = 0;
        setScrollProgress(0);
        return;
      }
      const nextValue = Math.max(0, Math.min(100, (window.scrollY / total) * 100));
      if (Math.abs(nextValue - scrollProgressRef.current) < 0.2) return;
      scrollProgressRef.current = nextValue;
      setScrollProgress(nextValue);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const canvas = document.querySelector(".ins-article-star-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let resizeRafId = 0;
    let isVisible = !document.hidden;
    let stars = [];

    function buildStars() {
      const count = Math.max(90, Math.floor((width * height) / 14000));
      stars = Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 1.8,
        a: 0.2 + Math.random() * 0.8,
        t: Math.random() * Math.PI * 2,
        tw: 0.008 + Math.random() * 0.02,
      }));
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function draw() {
      if (!isVisible) {
        rafId = 0;
        return;
      }
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        star.t += star.tw;
        const twinkle = (Math.sin(star.t) + 1) / 2;
        const alpha = star.a * (0.35 + twinkle * 0.65);
        ctx.beginPath();
        ctx.fillStyle = `rgba(232,228,255,${alpha.toFixed(3)})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = window.requestAnimationFrame(draw);
    }

    function scheduleResize() {
      if (resizeRafId) return;
      resizeRafId = window.requestAnimationFrame(() => {
        resizeRafId = 0;
        resize();
      });
    }

    function onVisibilityChange() {
      isVisible = !document.hidden;
      if (isVisible && !rafId) {
        rafId = window.requestAnimationFrame(draw);
      }
    }

    resize();
    draw();
    window.addEventListener("resize", scheduleResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(resizeRafId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", scheduleResize);
    };
  }, []);

  const metaLine = useMemo(() => {
    const topicLabel = topic?.label ? ` (${topic.label})` : "";
    return `${article.category}${topicLabel} · 업데이트 ${article.updatedAt}`;
  }, [article.category, article.updatedAt, topic?.label]);

  const breadcrumbItems = useMemo(() => [
    { label: '홈', href: '/' },
    { label: 'Insights', href: '/insights' },
    { label: article.category, href: `/insights?topic=${article.category}` },
    { label: article.title, href: `/insights/${article.slug}` },
  ], [article.category, article.slug, article.title]);

  return (
    <div className="ins-detail-root">
    <Breadcrumb items={breadcrumbItems} />
    <main className="ins-article-cosmic">
      <div className="ins-scroll-progress" style={{ width: `${scrollProgress}%` }} />
      <canvas className="ins-article-star-canvas" aria-hidden="true" />
      <div className="ins-article-bg-layer ins-article-nebula-a" aria-hidden="true" />
      <div className="ins-article-bg-layer ins-article-nebula-b" aria-hidden="true" />
      <div className="ins-article-bg-layer ins-article-grain" aria-hidden="true" />

      <div className="ins-article-wrap">
        <section className="ins-article-hero">
          <Link href="/insights" className="ins-back-pill">
            <span aria-hidden="true">‹</span> 목록으로
          </Link>

          <div className="ins-hero-meta-line">
            <span className="ins-hero-badge">{article.category}</span>
            <span className="ins-hero-date">{metaLine}</span>
          </div>

          <h1 className="ins-hero-title">
            <span className="ins-deco">「</span>
            {article.title}
            <span className="ins-deco">」</span>
          </h1>
          <div className="ins-hero-divider" aria-hidden="true" />
          <p className="ins-hero-lead">{article.description}</p>

          <div className="ins-tag-row">
            <span>✦ 어렵지 않은 설명</span>
            <span>✦ 실전 포인트 중심</span>
          </div>
        </section>

        <div className="ins-sections">
          {article.sections.map((section, index) => {
            const accent = getSectionAccent(index);
            return (
              <div key={section.heading}>
                <section className="ins-section-card" style={{ "--accent": accent, animationDelay: `${0.1 * index}s` }}>
                  <div className="ins-section-accent" aria-hidden="true" />
                  <div className="ins-section-head">
                    <span className="ins-section-no">{String(index + 1).padStart(2, "0")}</span>
                    <h2>{section.heading}</h2>
                  </div>
                  <div className="ins-section-divider" />
                  <p className="ins-article-body">{section.body}</p>
                  {Array.isArray(section.cards) && section.cards.length > 0 && (
                    <div className="ins-tarot-card-grid">
                      {section.cards.map((card) => (
                        <article key={card.id} className="ins-tarot-card-item">
                          <div className="ins-tarot-card-thumb">
                            <Image
                              src={buildTarotImageUrl(card.id)}
                              alt={`${card.name} 카드 이미지`}
                              fill
                              sizes="(max-width: 640px) 42vw, 220px"
                              loading="lazy"
                              decoding="async"
                              className="ins-tarot-card-image"
                            />
                          </div>
                          <h3 className="ins-tarot-card-title">
                            {card.id} · {card.name}
                          </h3>
                          <p className="ins-tarot-card-meaning">{card.meaning}</p>
                          <p className="ins-tarot-card-reading">{card.reading}</p>
                        </article>
                      ))}
                    </div>
                  )}
                  {Array.isArray(section.animalCards) && section.animalCards.length > 0 && (
                    <div className="ins-animal-card-grid">
                      {section.animalCards.map((item) => (
                        <article key={`${item.star}-${item.animalName}`} className="ins-animal-card-item">
                          <div className="ins-animal-card-head">
                            <span className="ins-animal-emoji" aria-hidden="true">{item.animalEmoji}</span>
                            <div className="ins-animal-title-wrap">
                              <h3 className="ins-animal-star">{item.star}</h3>
                              <p className="ins-animal-name">{item.animalName}</p>
                            </div>
                          </div>
                          <p className="ins-animal-trait">{item.trait}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
                {index < article.sections.length - 1 && <div className="ins-section-sep" aria-hidden="true">─ ✦ ─ ─ ─ ─ ─ ─ ─ ✦ ─</div>}
              </div>
            );
          })}
        </div>

        <div className="ins-end-ornament" aria-hidden="true">
          ── ✦ ✦ ✦ ──
        </div>

        <div className="ins-bottom-back-wrap">
          <Link href="/insights" className="ins-bottom-back">
            ✦ 목록으로 돌아가기
          </Link>
        </div>

        <section
          aria-label="저자 전문성 소개"
          style={{
            marginTop: "22px",
            marginBottom: "8px",
            borderRadius: "18px",
            padding: "18px 16px",
            border: "1px solid rgba(201, 168, 76, 0.36)",
            background:
              "linear-gradient(135deg, rgba(20, 23, 44, 0.88), rgba(32, 15, 48, 0.82))",
            boxShadow: "0 14px 28px rgba(4, 10, 28, 0.36)",
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.78, color: "#e2e8f0", wordBreak: "keep-all" }}>
            꽃돼지 연이는 감성의 결을 깊게 읽지만, 동시에 백사자 쌈바의 추진력으로 해석을 행동으로 바꾸는
            작성자입니다. Code: Destiny에서는 사주, 운세, 타로, 명리학 데이터를 바탕으로 지금 필요한 선택지를
            선명하게 제시합니다. 꿀꿀 사주·꿀꿀 운세·꿀꿀 만세력의 흐름을 통해 신비로운 통찰을 현실적인 계획으로
            연결합니다.
          </p>
        </section>

        {relatedArticles.length > 0 && (
          <section className="ins-related">
            <h3>같은 카테고리 추천 글</h3>
            <div className="ins-related-grid">
              {relatedArticles.map((related) => (
                <Link key={related.slug} href={`/insights/${related.slug}`} className="ins-related-card">
                  <div className="meta">{related.category} · 업데이트 {related.updatedAt}</div>
                  <div className="title">{related.title}</div>
                  <div className="desc">{related.description}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {article.relatedService && <ServiceCTA slug={article.relatedService} />}
      </div>
    </main>
    </div>
  );
}

