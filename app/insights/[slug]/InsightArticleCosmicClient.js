"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SECTION_ACCENTS = ["#c9a84c", "#4ecdc4", "#a78bfa", "#ff6b9d", "#60a5fa"];

function getSectionAccent(index) {
  return SECTION_ACCENTS[index % SECTION_ACCENTS.length];
}

export default function InsightArticleCosmicClient({ article, topic, relatedArticles }) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) {
        setScrollProgress(0);
        return;
      }
      const value = Math.max(0, Math.min(100, (window.scrollY / total) * 100));
      setScrollProgress(value);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
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

    resize();
    draw();
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const metaLine = useMemo(() => {
    const topicLabel = topic?.label ? ` (${topic.label})` : "";
    return `${article.category}${topicLabel} · 업데이트 ${article.updatedAt}`;
  }, [article.category, article.updatedAt, topic?.label]);

  return (
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
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=IM+Fell+English:ital@0;1&family=Noto+Sans+KR:wght@400;500;700;800&family=Noto+Serif+KR:wght@400;500;700;800&display=swap");
        .ins-article-cosmic {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          max-width: 940px;
          margin: 0 auto;
          padding: 24px 16px 56px;
          color: #e2e8f0;
          background: radial-gradient(860px 300px at 10% 0%, rgba(124, 58, 237, 0.17), transparent 60%),
            radial-gradient(720px 280px at 90% 0%, rgba(29, 78, 216, 0.15), transparent 56%);
        }
        .ins-article-wrap {
          display: grid;
          gap: 16px;
        }
        .ins-scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 2px;
          z-index: 40;
          background: linear-gradient(90deg, #c9a84c, #a78bfa);
        }
        .ins-article-star-canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -3;
        }
        .ins-article-bg-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -3;
        }
        .ins-article-nebula-a {
          background: radial-gradient(820px 320px at 8% 4%, rgba(124, 58, 237, 0.19), transparent 62%),
            radial-gradient(760px 280px at 90% 10%, rgba(78, 205, 196, 0.12), transparent 64%);
          filter: blur(2px);
        }
        .ins-article-nebula-b {
          z-index: -2;
          background: radial-gradient(660px 240px at 30% 70%, rgba(201, 168, 76, 0.14), transparent 68%),
            radial-gradient(520px 220px at 78% 62%, rgba(29, 78, 216, 0.14), transparent 68%);
          filter: blur(10px);
        }
        .ins-article-grain {
          z-index: -1;
          opacity: 0.1;
          mix-blend-mode: soft-light;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 0.5px, transparent 0.6px);
          background-size: 3px 3px;
        }
        .ins-back-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 12px;
          letter-spacing: 0.05em;
          color: rgba(226, 232, 240, 0.8);
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 6px 12px;
          transition: all 0.25s ease;
        }
        .ins-back-pill:hover {
          border-color: rgba(201, 168, 76, 0.6);
          color: #f8fafc;
        }
        .ins-article-hero {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(201, 168, 76, 0.2);
          background: rgba(10, 8, 40, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 32px 28px 28px;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.34);
        }
        .ins-hero-meta-line {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          opacity: 0.6;
        }
        .ins-hero-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(167, 139, 250, 0.42);
          background: rgba(167, 139, 250, 0.15);
          color: #f3e8ff;
          font-weight: 700;
          padding: 3px 9px;
          font-family: "Noto Sans KR", sans-serif;
        }
        .ins-hero-date {
          color: #ddd6fe;
          font-family: "Noto Serif KR", serif;
          text-align: right;
        }
        .ins-hero-title {
          margin: 14px 0 0;
          font-family: "Noto Serif KR", serif;
          font-weight: 800;
          font-size: 26px;
          color: #f0eaff;
          line-height: 1.55;
          letter-spacing: 0.01em;
          word-break: keep-all;
        }
        .ins-deco {
          color: #f0d080;
          opacity: 0.8;
          margin: 0 2px;
        }
        .ins-hero-divider {
          width: 60px;
          height: 1px;
          margin-top: 12px;
          background: linear-gradient(90deg, rgba(201, 168, 76, 0.95), transparent);
        }
        .ins-hero-lead {
          margin-top: 16px;
          font-size: 14px;
          line-height: 1.9;
          color: rgba(196, 192, 224, 0.8);
          font-family: "Noto Serif KR", serif;
          word-break: keep-all;
        }
        .ins-tag-row {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ins-tag-row span {
          display: inline-flex;
          align-items: center;
          border-radius: 20px;
          border: 1px dashed rgba(201, 168, 76, 0.4);
          background: rgba(201, 168, 76, 0.06);
          color: #f8eecb;
          font-size: 11px;
          letter-spacing: 0.08em;
          padding: 5px 10px;
          font-family: "Noto Sans KR", sans-serif;
        }
        .ins-sections {
          display: grid;
          gap: 16px;
        }
        .ins-section-card {
          position: relative;
          background: rgba(14, 11, 45, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 24px 26px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.03);
          opacity: 0;
          transform: translateY(20px);
          animation: insFadeInUp 0.52s ease forwards;
        }
        .ins-section-accent {
          position: absolute;
          left: 12px;
          top: 18px;
          width: 3px;
          height: 40px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 14px color-mix(in oklab, var(--accent) 35%, transparent);
        }
        .ins-section-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 8px;
        }
        .ins-section-no {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in oklab, var(--accent) 20%, transparent);
          border: 1px solid color-mix(in oklab, var(--accent) 50%, transparent);
          color: #f8fafc;
          font-size: 12px;
          line-height: 1;
          font-family: "Cinzel", "IM Fell English", serif;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .ins-section-head h2 {
          margin: 0;
          font-family: "Noto Serif KR", serif;
          font-weight: 700;
          font-size: 17px;
          color: #e8e4ff;
          line-height: 1.5;
          word-break: keep-all;
        }
        .ins-section-divider {
          margin: 12px 0 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .ins-article-body {
          margin: 0;
          font-family: "Noto Serif KR", serif;
          font-size: 14px;
          line-height: 2;
          color: rgba(196, 192, 224, 0.78);
          word-break: keep-all;
          text-align: justify;
        }
        .ins-article-body :global(blockquote) {
          margin: 12px 0;
          border-left: 3px solid rgba(201, 168, 76, 0.9);
          background: rgba(201, 168, 76, 0.05);
          padding: 12px 18px;
          border-radius: 0 8px 8px 0;
          color: #f0d080;
          font-style: italic;
        }
        .ins-section-sep {
          text-align: center;
          color: rgba(201, 168, 76, 0.48);
          opacity: 0.4;
          letter-spacing: 0.08em;
          font-size: 12px;
          margin-top: 2px;
        }
        .ins-end-ornament {
          text-align: center;
          opacity: 0.3;
          color: #f0d080;
          letter-spacing: 0.1em;
          margin-top: 2px;
          font-size: 14px;
        }
        .ins-bottom-back-wrap {
          display: flex;
          justify-content: center;
        }
        .ins-bottom-back {
          text-decoration: none;
          border-radius: 999px;
          border: 1px solid rgba(201, 168, 76, 0.4);
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          padding: 10px 16px;
          font-size: 13px;
          letter-spacing: 0.02em;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.25s ease;
        }
        .ins-bottom-back:hover {
          box-shadow: 0 0 16px rgba(201, 168, 76, 0.25);
          border-color: rgba(240, 208, 128, 0.7);
        }
        .ins-related {
          margin-top: 2px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(30, 41, 59, 0.68));
          box-shadow: 0 12px 34px rgba(2, 6, 23, 0.3);
          padding: 16px;
        }
        .ins-related h3 {
          margin: 0 0 10px;
          font-family: "Noto Serif KR", serif;
          font-size: 1.12rem;
          color: #f8fafc;
        }
        .ins-related-grid {
          display: grid;
          gap: 10px;
        }
        .ins-related-card {
          text-decoration: none;
          display: block;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(15, 23, 42, 0.62);
          padding: 12px;
          color: #e2e8f0;
        }
        .ins-related-card .meta {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }
        .ins-related-card .title {
          font-weight: 800;
          line-height: 1.5;
          margin-bottom: 4px;
          color: #f8fafc;
          word-break: keep-all;
        }
        .ins-related-card .desc {
          font-size: 14px;
          opacity: 0.88;
          line-height: 1.65;
          word-break: keep-all;
        }
        @keyframes insFadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 640px) {
          .ins-article-cosmic {
            padding: 16px 10px 44px;
          }
          .ins-article-wrap {
            gap: 14px;
          }
          .ins-article-hero {
            padding: 20px 16px 18px;
          }
          .ins-hero-meta-line {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }
          .ins-hero-title {
            font-size: 21px;
            line-height: 1.52;
          }
          .ins-hero-lead {
            font-size: 13px;
          }
          .ins-section-card {
            padding: 18px 14px;
          }
          .ins-section-accent {
            left: 8px;
            top: 14px;
          }
          .ins-section-head {
            padding-left: 4px;
            gap: 10px;
          }
          .ins-section-head h2 {
            font-size: 16px;
          }
          .ins-article-body {
            font-size: 13px;
            line-height: 1.9;
            text-align: left;
          }
          .ins-section-sep {
            font-size: 11px;
          }
          .ins-bottom-back {
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}

