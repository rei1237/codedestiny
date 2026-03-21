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

const LANGUAGE_FILTERS = [
  { key: "all", label: "언어 전체", symbol: "✦", color: "#c9a84c" },
  { key: "ko", label: "한국어", symbol: "가", color: "#f0d080" },
  { key: "en", label: "English", symbol: "EN", color: "#93c5fd" },
  { key: "ja", label: "日本語", symbol: "日", color: "#a7f3d0" },
  { key: "zh-Hans", label: "中文", symbol: "中", color: "#fca5a5" },
  { key: "fr", label: "Français", symbol: "FR", color: "#ddd6fe" },
];

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

function getArticleLang(article) {
  return typeof article?.lang === "string" && article.lang ? article.lang : "ko";
}

export default function InsightsCosmicClient({ initialTopic = "all" }) {
  const [topic, setTopic] = useState(safeTopic(initialTopic));
  const [language, setLanguage] = useState("all");
  const starCanvasRef = useRef(null);

  useEffect(() => {
    setTopic(safeTopic(initialTopic));
  }, [initialTopic]);

  const filteredArticles = useMemo(() => {
    return INSIGHT_ARTICLES.filter((article) => {
      const matchTopic = topic === "all" || getTopicKey(article) === topic;
      const matchLanguage = language === "all" || getArticleLang(article) === language;
      return matchTopic && matchLanguage;
    });
  }, [topic, language]);

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
              if (item.key !== "all") return null;
              const meta = TOPIC_META.all;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`ins-pill ${topic === "all" ? "is-active" : ""}`}
                  style={{ "--accent": meta.color }}
                  onClick={() => setTopic("all")}
                >
                  <span className="ins-pill-symbol">{meta.symbol}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            {LANGUAGE_FILTERS.map((item) => (
              <button
                key={`lang-${item.key}`}
                type="button"
                className={`ins-pill ins-pill--lang ${language === item.key ? "is-active" : ""}`}
                style={{ "--accent": item.color }}
                onClick={() => setLanguage(item.key)}
              >
                <span className="ins-pill-symbol">{item.symbol}</span>
                <span>{item.label}</span>
              </button>
            ))}

            {INSIGHT_TOPICS.map((item) => {
              if (item.key === "all") return null;
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
    </>
  );
}

