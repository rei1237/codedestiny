"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { INSIGHT_ARTICLES, INSIGHT_TOPICS, getTopicKey } from "./articles";

const TOPIC_META = {
  all: { color: "#c9a84c", symbol: "✦", label: "전체" },
  saju: { color: "#ff6b9d", symbol: "☽", label: "사주" },
  tarot: { color: "#a78bfa", symbol: "✦", label: "타로" },
  sukuyo: { color: "#4ecdc4", symbol: "◈", label: "숙요점" },
  vedic: { color: "#f0d080", symbol: "♃", label: "베다점" },
  astrology: { color: "#60a5fa", symbol: "♄", label: "점성술" },
  ziwei: { color: "#c084fc", symbol: "✵", label: "자미두수" },
};

const CATEGORY_META = {
  "사주 기초": { color: "#ff6b9d", symbol: "☽" },
  "사주 심화": { color: "#ff8c42", symbol: "☀" },
  "타로 이론": { color: "#a78bfa", symbol: "✦" },
  숙요점: { color: "#4ecdc4", symbol: "◈" },
  베다점: { color: "#f0d080", symbol: "♃" },
  점성술: { color: "#60a5fa", symbol: "♄" },
  자미두수: { color: "#c084fc", symbol: "✵" },
};

function safeTopic(topicKey) {
  return INSIGHT_TOPICS.some((topic) => topic.key === topicKey) ? topicKey : "all";
}

function getCardMeta(article) {
  return CATEGORY_META[article?.category] || { color: "#6b7280", symbol: "✦" };
}

export default function InsightsCosmicClient({ initialTopic = "all" }) {
  const [topic, setTopic] = useState(safeTopic(initialTopic));
  const starCanvasRef = useRef(null);

  useEffect(() => {
    setTopic(safeTopic(initialTopic));
  }, [initialTopic]);

  const filteredArticles = useMemo(() => {
    if (topic === "all") return INSIGHT_ARTICLES;
    return INSIGHT_ARTICLES.filter((article) => getTopicKey(article) === topic);
  }, [topic]);

  const featuredArticle = filteredArticles[0] || null;
  const normalArticles = featuredArticle ? filteredArticles.slice(1) : filteredArticles;

  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;

    const layers = [
      { count: 120, minR: 0.4, maxR: 1, speed: 0.009, minA: 0.18, maxA: 0.46 },
      { count: 90, minR: 0.9, maxR: 1.7, speed: 0.013, minA: 0.25, maxA: 0.66 },
      { count: 52, minR: 1.5, maxR: 2.5, speed: 0.019, minA: 0.33, maxA: 0.9 },
    ];

    let stars = [];

    function buildStars() {
      stars = [];
      layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i += 1) {
          stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: layer.minR + Math.random() * (layer.maxR - layer.minR),
            a: layer.minA + Math.random() * (layer.maxA - layer.minA),
            t: Math.random() * Math.PI * 2,
            tw: layer.speed * (0.7 + Math.random() * 1.3),
          });
        }
      });
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

  return (
    <>
      <canvas ref={starCanvasRef} className="ins-starfield" />
      <div className="ins-grain" />

      <main className="ins-wrap">
        <section className="ins-hero ins-reveal-a">
          <div className="ins-hero-nebula" aria-hidden="true" />
          <div className="ins-hero-inner">
            <Link href="/" className="ins-home-pill">
              <span aria-hidden="true">⌂</span> 홈으로
            </Link>
            <div className="ins-sigil" aria-hidden="true">
              <svg viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="41" stroke="rgba(240,208,128,.75)" strokeWidth="1.3" />
                <circle cx="50" cy="50" r="31" stroke="rgba(232,228,255,.42)" strokeWidth="1.1" />
                <path d="M50 18 L56 44 L83 50 L56 56 L50 82 L44 56 L17 50 L44 44 Z" fill="rgba(240,208,128,.2)" />
                <circle cx="50" cy="50" r="4.2" fill="rgba(240,208,128,.92)" />
                <circle cx="50" cy="50" r="17" stroke="rgba(167,139,250,.4)" strokeWidth="1" />
                <circle cx="50" cy="50" r="41" stroke="rgba(240,208,128,.42)" strokeWidth="1" className="ins-orbit-ring" />
              </svg>
            </div>
            <h1 className="ins-title">
              <span className="ins-title-deco">「</span>
              운세 인사이트 허브
              <span className="ins-title-deco">」</span>
            </h1>
            <p className="ins-subtitle-en">어렵지 않게 읽는 운세 지식 · 3분 인사이트</p>
            <div className="ins-hero-line" aria-hidden="true" />
            <p className="ins-desc">
              심우주 어딘가에 숨겨진 운명의 서가에서, 사주부터 점성술까지 핵심만 선명하게 읽어보세요.
            </p>
            <div className="ins-hero-stats">
              <span>총 {INSIGHT_ARTICLES.length}개 글</span>
              <span>{INSIGHT_TOPICS.length}개 카테고리</span>
              <span>평균 3분 읽기</span>
            </div>
          </div>
        </section>

        <section className="ins-sticky-filter ins-reveal-b">
          <nav className="ins-filters" aria-label="인사이트 카테고리 필터">
            {INSIGHT_TOPICS.map((item) => {
              const active = topic === item.key;
              const meta = TOPIC_META[item.key] || TOPIC_META.all;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`ins-pill ${active ? "is-active" : ""}`}
                  style={{ "--accent": meta.color }}
                  onClick={() => setTopic(item.key)}
                >
                  <span className="ins-pill-symbol">{meta.symbol}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </section>

        <section className="ins-list ins-reveal-c" aria-live="polite">
          {featuredArticle && (
            <Link href={`/insights/${featuredArticle.slug}`} className="ins-featured-card">
              <span className="ins-featured-accent" aria-hidden="true" />
              <span className="ins-featured-label">FEATURED</span>
              <div className="ins-featured-meta">
                <span className="ins-badge" style={{ "--accent": getCardMeta(featuredArticle).color }}>
                  {featuredArticle.category}
                </span>
              </div>
              <h2>
                <span className="ins-label">제목</span>
                <span className="ins-value">{featuredArticle.title}</span>
              </h2>
              <p>
                <span className="ins-label">설명</span>
                <span className="ins-value">{featuredArticle.description}</span>
              </p>
              <div className="ins-featured-read">읽기 →</div>
            </Link>
          )}

          {normalArticles.map((article) => {
            const meta = getCardMeta(article);
            return (
              <Link key={article.slug} href={`/insights/${article.slug}`} className="ins-card" style={{ "--accent": meta.color }}>
                <div className="ins-card-meta">
                  <span className="ins-badge">{article.category}</span>
                </div>
                <h2>
                  <span className="ins-label">제목</span>
                  <span className="ins-value">{article.title}</span>
                </h2>
                <p>
                  <span className="ins-label">설명</span>
                  <span className="ins-value">{article.description}</span>
                </p>
              </Link>
            );
          })}
        </section>
      </main>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=IM+Fell+English:ital@0;1&family=Noto+Sans+KR:wght@400;500;700;800&family=Noto+Serif+KR:wght@400;500;600;700;800&display=swap");

        .ins-starfield {
          position: fixed;
          inset: 0;
          z-index: -4;
          pointer-events: none;
        }
        .ins-grain {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 0.4px, transparent 0.6px);
          background-size: 3px 3px;
          mix-blend-mode: soft-light;
          opacity: 0.08;
        }
        .ins-wrap {
          width: min(940px, calc(100% - 32px));
          margin: 24px auto 56px;
          position: relative;
          z-index: 2;
          display: grid;
          gap: 12px;
        }
        .ins-reveal-a,
        .ins-reveal-b,
        .ins-reveal-c {
          opacity: 0;
          transform: translateY(16px);
          animation: ins-reveal-up 0.5s ease forwards;
        }
        .ins-reveal-a {
          animation-delay: 0.05s;
        }
        .ins-reveal-b {
          animation-delay: 0.2s;
        }
        .ins-reveal-c {
          animation-delay: 0.35s;
        }

        .ins-hero {
          position: relative;
          min-height: 280px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(201, 168, 76, 0.2);
          background: rgba(10, 8, 40, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }
        .ins-hero-nebula {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(540px 280px at 50% 32%, rgba(124, 58, 237, 0.26), rgba(201, 168, 76, 0.16) 42%, transparent 72%);
          filter: blur(14px);
          z-index: 0;
        }
        .ins-hero-inner {
          min-height: 280px;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 22px 22px 20px;
        }
        .ins-home-pill {
          position: absolute;
          top: 12px;
          left: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(232, 228, 255, 0.92);
          text-decoration: none;
          font-family: "Noto Sans KR", sans-serif;
          font-size: 12px;
          letter-spacing: 0.02em;
          padding: 6px 11px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.22s ease;
        }
        .ins-home-pill:hover {
          border-color: rgba(201, 168, 76, 0.55);
          color: #fff7d6;
          box-shadow: 0 0 14px rgba(201, 168, 76, 0.2);
        }
        .ins-sigil {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(240, 208, 128, 0.35);
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: 10px;
          box-shadow: 0 0 20px rgba(201, 168, 76, 0.16);
        }
        .ins-sigil :global(svg) {
          width: 62px;
          height: 62px;
        }
        .ins-orbit-ring {
          transform-origin: 50px 50px;
          animation: ins-spin 12s linear infinite;
        }
        .ins-title {
          margin: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 2px;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(1.42rem, 2.9vw, 1.95rem);
          line-height: 1.42;
          letter-spacing: 0.012em;
          font-weight: 800;
          background: linear-gradient(96deg, #f2dd99 8%, #f8f2dd 44%, #c9a84c 95%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 14px rgba(201, 168, 76, 0.18);
        }
        .ins-title-deco {
          color: #f0d080;
          opacity: 0.8;
          margin: 0 1px;
        }
        .ins-subtitle-en {
          margin: 7px 0 0;
          font-family: "IM Fell English", serif;
          font-size: 13px;
          opacity: 0.6;
          letter-spacing: 0.1em;
          color: #ddd6fe;
        }
        .ins-hero-line {
          width: 80px;
          height: 1px;
          margin-top: 10px;
          background: linear-gradient(90deg, transparent, rgba(240, 208, 128, 0.85), transparent);
        }
        .ins-desc {
          margin: 12px auto 0;
          max-width: 520px;
          font-family: "Noto Serif KR", serif;
          font-size: 14px;
          line-height: 1.9;
          color: rgba(196, 192, 224, 0.8);
          word-break: keep-all;
          overflow-wrap: anywhere;
        }
        .ins-hero-stats {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }
        .ins-hero-stats span {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
          padding: 5px 11px;
          font-size: 11px;
          color: rgba(232, 228, 255, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-family: "Noto Sans KR", sans-serif;
        }

        .ins-sticky-filter {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 8, 40, 0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 20px;
        }
        .ins-filters {
          display: flex;
          overflow-x: auto;
          gap: 8px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .ins-filters::-webkit-scrollbar {
          display: none;
        }
        .ins-pill {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: #e8e4ff;
          border-radius: 999px;
          padding: 7px 11px;
          cursor: pointer;
          font-family: "Noto Sans KR", sans-serif;
          font-size: 12px;
          white-space: nowrap;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ins-pill-symbol {
          opacity: 0.9;
          color: color-mix(in oklab, var(--accent) 82%, #ffffff 10%);
        }
        .ins-pill.is-active {
          border-color: color-mix(in oklab, var(--accent) 50%, transparent);
          background: color-mix(in oklab, var(--accent) 15%, transparent);
          box-shadow: 0 0 8px color-mix(in oklab, var(--accent) 30%, transparent);
        }

        .ins-list {
          display: grid;
          gap: 12px;
        }
        .ins-featured-card {
          position: relative;
          min-height: 160px;
          border-radius: 14px;
          background: rgba(14, 11, 45, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 3px solid rgba(201, 168, 76, 0.9);
          padding: 22px 24px;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 4px 22px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .ins-featured-card:hover {
          transform: translateY(-2px);
          border-color: rgba(240, 208, 128, 0.52);
        }
        .ins-featured-accent {
          display: none;
        }
        .ins-featured-label {
          position: absolute;
          right: 14px;
          top: 11px;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: rgba(240, 208, 128, 0.8);
          opacity: 0.7;
        }
        .ins-featured-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .ins-featured-card h2 {
          margin: 10px 0 0;
          font-family: "Noto Serif KR", serif;
          font-size: 20px;
          line-height: 1.5;
          color: #f0eaff;
          font-weight: 700;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          word-break: keep-all;
        }
        .ins-featured-card p {
          margin: 9px 0 0;
          font-family: "Noto Serif KR", serif;
          font-size: 13px;
          line-height: 1.8;
          color: rgba(196, 192, 224, 0.78);
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }
        .ins-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 20px;
          margin-right: 7px;
          border-radius: 999px;
          border: 1px solid rgba(240, 208, 128, 0.3);
          background: rgba(240, 208, 128, 0.09);
          color: rgba(240, 208, 128, 0.95);
          font-weight: 700;
          letter-spacing: 0.02em;
          font-family: "Noto Sans KR", sans-serif;
          font-size: 11px;
          flex-shrink: 0;
        }
        .ins-value {
          display: inline;
          vertical-align: baseline;
        }
        .ins-featured-read {
          margin-top: 8px;
          text-align: right;
          font-size: 12px;
          color: #f0d080;
        }

        .ins-card {
          position: relative;
          background: rgba(14, 11, 45, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-left: 3px solid var(--accent);
          border-radius: 12px;
          padding: 20px 22px;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 4px 22px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.03);
          cursor: pointer;
        }
        .ins-card:hover {
          transform: translateY(-2px);
          border-left-color: color-mix(in oklab, var(--accent) 70%, #fff 20%);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .ins-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: #f8f4ff;
          border: 1px solid color-mix(in oklab, var(--accent) 50%, transparent);
          background: color-mix(in oklab, var(--accent) 15%, transparent);
          font-weight: 600;
          font-family: "Noto Sans KR", sans-serif;
          text-transform: none;
        }
        .ins-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .ins-card h2 {
          margin: 10px 0 0;
          font-family: "Noto Serif KR", serif;
          font-size: 17px;
          line-height: 1.5;
          color: #e8e4ff;
          font-weight: 700;
          word-break: keep-all;
        }
        .ins-card p {
          margin: 8px 0 0;
          font-family: "Noto Serif KR", serif;
          font-size: 13px;
          line-height: 1.8;
          color: rgba(196, 192, 224, 0.78);
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        @keyframes ins-reveal-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ins-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .ins-wrap {
            width: min(940px, calc(100% - 20px));
            margin-top: 16px;
            margin-bottom: 36px;
            gap: 10px;
          }
          .ins-sticky-filter {
            padding: 10px 12px;
            border-radius: 12px;
            top: 6px;
          }
          .ins-filters {
            gap: 6px;
            padding-bottom: 2px;
          }
          .ins-pill {
            font-size: 11px;
            padding: 8px 10px;
            min-height: 34px;
          }
          .ins-hero {
            min-height: 320px;
          }
          .ins-hero-inner {
            min-height: 320px;
            padding: 18px 12px 16px;
          }
          .ins-home-pill {
            top: 10px;
            left: 10px;
            font-size: 11px;
            padding: 5px 10px;
          }
          .ins-sigil {
            width: 64px;
            height: 64px;
            margin-bottom: 8px;
          }
          .ins-sigil :global(svg) {
            width: 54px;
            height: 54px;
          }
          .ins-title {
            font-size: clamp(1.24rem, 6.2vw, 1.45rem);
            line-height: 1.36;
            padding-inline: 4px;
          }
          .ins-subtitle-en {
            margin-top: 6px;
            font-size: 11px;
            letter-spacing: 0.07em;
          }
          .ins-hero-line {
            margin-top: 8px;
          }
          .ins-desc {
            margin-top: 10px;
            font-size: 13px;
            line-height: 1.72;
            max-width: 100%;
            padding-inline: 6px;
          }
          .ins-hero-stats {
            margin-top: 12px;
            gap: 6px;
          }
          .ins-hero-stats span {
            font-size: 10px;
            padding: 4px 9px;
            white-space: nowrap;
          }
          .ins-featured-card {
            min-height: 148px;
            padding: 16px 14px;
            border-radius: 12px;
          }
          .ins-featured-card h2 {
            font-size: 16px;
            line-height: 1.45;
          }
          .ins-featured-card p {
            font-size: 12px;
            line-height: 1.7;
          }
          .ins-featured-label {
            top: 9px;
            right: 10px;
            font-size: 8px;
          }
          .ins-label {
            min-width: 30px;
            height: 18px;
            margin-right: 6px;
            font-size: 10px;
          }
          .ins-card {
            padding: 18px 14px;
            border-radius: 11px;
          }
          .ins-card h2 {
            font-size: 15px;
            line-height: 1.46;
          }
          .ins-card p {
            font-size: 12px;
            line-height: 1.7;
          }
          .ins-badge {
            font-size: 9px;
            padding: 3px 8px;
          }
        }

        @media (max-width: 430px) {
          .ins-wrap {
            width: calc(100% - 16px);
            margin-top: 12px;
            gap: 8px;
          }
          .ins-hero {
            border-radius: 14px;
          }
          .ins-hero-inner {
            padding: 16px 10px 14px;
          }
          .ins-home-pill {
            top: 8px;
            left: 8px;
          }
          .ins-desc {
            padding-inline: 4px;
          }
          .ins-sticky-filter {
            padding: 9px 10px;
          }
          .ins-pill {
            padding: 7px 9px;
            gap: 5px;
          }
          .ins-featured-card {
            padding: 14px 12px;
          }
          .ins-card {
            padding: 15px 12px;
          }
        }
      `}</style>
    </>
  );
}

