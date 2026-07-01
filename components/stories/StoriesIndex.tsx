"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { estimateReadingMinutes } from "@/lib/stories/metrics";
import type { IStory } from "@/lib/stories/types";
import {
  READER_BODY_FONT_OPTIONS,
  READER_DISPLAY_FONT_STACK,
  getReaderBodyFontOptions,
  getReadingPresetOptions,
  useReaderSettings,
} from "@/hooks/useReaderSettings";
import StoryCard from "./StoryCard";
import styles from "./storiesIndex.module.css";

interface StoriesIndexProps {
  stories: IStory[];
}

type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "es" | "fr" | "de";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkle: boolean;
  duration: number;
  delay: number;
}

const STORIES_INDEX_TEXT_TRANSLATIONS = {
  ko: {
    kicker: "MOONLIT SERIAL",
    titlePrefix: "별빛 아래 펼쳐지는",
    titleStrong: "Code Destiny Novel",
    introTop: "달빛의 결은 남기고, 읽는 피로는 덜어낸 화면으로",
    introBottom: "한 편씩 오래 머물 수 있게 정리했습니다.",
    ribbonAria: "달빛 서재 모드",
    ribbon: "입장부터 마지막 문장까지 별빛 가독성으로 다듬은 달빛 서재 모드",
    statusAria: "소설 현황",
    episodeSuffix: "화",
    publishedChapters: "공개 화수",
    free: "무료",
    freeAll: "전편 공개",
    minutesSuffix: "분+",
    readingEstimate: "예상 독서",
    featuredAria: "대표 웹소설",
    coverEyebrow: "대표 작품 · FEATURED",
    serialNow: "지금 연재 중",
    publishedMeta: "📖 {count}화 공개",
    freeMeta: "✨ 무료 전편",
    readingMeta: "🌙 {minutes}분 독서",
    continue: "📖 이어읽기",
    tableOfContents: "목차 보기",
    openPrologue: "프롤로그 열기",
    settings: "읽기 환경 설정",
    preview: "별빛은 잔잔하게 흐르고, 문장은 오래 머무를수록 더 또렷해집니다.",
    lineHeight: "행간",
    relaxedPreset: "편안하게",
    gridAria: "Code Destiny novel",
  },
  en: {
    kicker: "MOONLIT SERIAL",
    titlePrefix: "Unfolding beneath starlight",
    titleStrong: "Code Destiny Novel",
    introTop: "A screen that keeps the moonlit texture",
    introBottom: "while easing the fatigue of long reading.",
    ribbonAria: "Moonlit library mode",
    ribbon: "A moonlit library mode polished for starlit readability from entry to final line",
    statusAria: "Novel status",
    episodeSuffix: " chapters",
    publishedChapters: "Published",
    free: "Free",
    freeAll: "All chapters open",
    minutesSuffix: " min+",
    readingEstimate: "Reading time",
    featuredAria: "Featured web novel",
    coverEyebrow: "Featured Work · FEATURED",
    serialNow: "Now Serializing",
    publishedMeta: "📖 {count} chapters open",
    freeMeta: "✨ All chapters free",
    readingMeta: "🌙 {minutes} min reading",
    continue: "📖 Continue Reading",
    tableOfContents: "View Contents",
    openPrologue: "Open Prologue",
    settings: "Reading Settings",
    preview: "Starlight flows quietly, and each sentence becomes clearer the longer it stays.",
    lineHeight: "line height",
    relaxedPreset: "Comfort",
    gridAria: "Code Destiny novel",
  },
  ja: {
    kicker: "MOONLIT SERIAL",
    titlePrefix: "星明かりの下に広がる",
    titleStrong: "Code Destiny Novel",
    introTop: "月明かりの質感を残しながら、読む疲れを軽くした画面で",
    introBottom: "一話ずつ長く留まれるよう整えました。",
    ribbonAria: "月明かり書斎モード",
    ribbon: "入場から最後の一文まで、星明かりの読みやすさで整えた月明かり書斎モード",
    statusAria: "小説の状況",
    episodeSuffix: "話",
    publishedChapters: "公開話数",
    free: "無料",
    freeAll: "全話公開",
    minutesSuffix: "分+",
    readingEstimate: "読書目安",
    featuredAria: "代表ウェブ小説",
    coverEyebrow: "代表作品 · FEATURED",
    serialNow: "連載中",
    publishedMeta: "📖 {count}話公開",
    freeMeta: "✨ 全話無料",
    readingMeta: "🌙 {minutes}分読書",
    continue: "📖 続きを読む",
    tableOfContents: "目次を見る",
    openPrologue: "プロローグを開く",
    settings: "読書環境設定",
    preview: "星明かりは静かに流れ、文章は長く留まるほど鮮明になります。",
    lineHeight: "行間",
    relaxedPreset: "心地よく",
    gridAria: "Code Destiny novel",
  },
  "zh-CN": {
    kicker: "MOONLIT SERIAL",
    titlePrefix: "星光之下展开的",
    titleStrong: "Code Destiny Novel",
    introTop: "保留月光质感，也减轻阅读疲劳的画面",
    introBottom: "让你能在每一章里停留更久。",
    ribbonAria: "月光书房模式",
    ribbon: "从入场到最后一句，都以星光可读性打磨的月光书房模式",
    statusAria: "小说状态",
    episodeSuffix: "章",
    publishedChapters: "公开章节",
    free: "免费",
    freeAll: "全篇公开",
    minutesSuffix: "分钟+",
    readingEstimate: "预计阅读",
    featuredAria: "代表网络小说",
    coverEyebrow: "代表作品 · FEATURED",
    serialNow: "正在连载",
    publishedMeta: "📖 已公开 {count} 章",
    freeMeta: "✨ 全篇免费",
    readingMeta: "🌙 {minutes} 分钟阅读",
    continue: "📖 继续阅读",
    tableOfContents: "查看目录",
    openPrologue: "打开序章",
    settings: "阅读环境设置",
    preview: "星光静静流动，句子停留越久越清晰。",
    lineHeight: "行距",
    relaxedPreset: "舒适",
    gridAria: "Code Destiny novel",
  },
  "zh-TW": {
    kicker: "MOONLIT SERIAL",
    titlePrefix: "星光之下展開的",
    titleStrong: "Code Destiny Novel",
    introTop: "保留月光質感，也減輕閱讀疲勞的畫面",
    introBottom: "讓你能在每一章裡停留更久。",
    ribbonAria: "月光書房模式",
    ribbon: "從入場到最後一句，都以星光可讀性打磨的月光書房模式",
    statusAria: "小說狀態",
    episodeSuffix: "章",
    publishedChapters: "公開章節",
    free: "免費",
    freeAll: "全篇公開",
    minutesSuffix: "分鐘+",
    readingEstimate: "預計閱讀",
    featuredAria: "代表網路小說",
    coverEyebrow: "代表作品 · FEATURED",
    serialNow: "正在連載",
    publishedMeta: "📖 已公開 {count} 章",
    freeMeta: "✨ 全篇免費",
    readingMeta: "🌙 {minutes} 分鐘閱讀",
    continue: "📖 繼續閱讀",
    tableOfContents: "查看目錄",
    openPrologue: "開啟序章",
    settings: "閱讀環境設定",
    preview: "星光靜靜流動，句子停留越久越清晰。",
    lineHeight: "行距",
    relaxedPreset: "舒適",
    gridAria: "Code Destiny novel",
  },
} as const;

function normalizeStoriesIndexLocale(value?: string | null): LoadingLocale {
  const locale = (value || "").toLowerCase();
  if (locale.startsWith("en")) return "en";
  if (locale.startsWith("ja") || locale.startsWith("jp")) return "ja";
  if (locale.startsWith("zh-tw") || locale.startsWith("zh-hant") || locale.includes("traditional")) return "zh-TW";
  if (locale.startsWith("zh")) return "zh-CN";
  if (locale.startsWith("vi")) return "vi";
  if (locale.startsWith("es")) return "es";
  if (locale.startsWith("fr")) return "fr";
  if (locale.startsWith("de")) return "de";
  return "ko";
}

function getCurrentStoriesIndexLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
  if (runtimeLanguage) return normalizeStoriesIndexLocale(runtimeLanguage);
  try {
    const stored = window.localStorage.getItem("cd_locale") || window.localStorage.getItem("code-destiny-locale");
    if (stored) return normalizeStoriesIndexLocale(stored);
  } catch (_) {}
  return normalizeStoriesIndexLocale(document.documentElement.lang || navigator.language);
}

function getStoriesIndexCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return STORIES_INDEX_TEXT_TRANSLATIONS[locale];
  }
  return STORIES_INDEX_TEXT_TRANSLATIONS.ko;
}

function formatStoriesIndexText(value: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce((text, [key, replacement]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), String(replacement)), value);
}

function generateStars(count: number, seed = 42): Star[] {
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  return Array.from({ length: count }, () => {
    const sizeRoll = rng();
    return {
      x: rng() * 100,
      y: rng() * 100,
      size: sizeRoll < 0.15 ? 1.8 : sizeRoll < 0.5 ? 1.1 : 0.7,
      opacity: 0.18 + rng() * 0.5,
      twinkle: rng() < 0.25,
      duration: 2.5 + rng() * 3,
      delay: rng() * 3,
    };
  });
}

export default function StoriesIndex({ stories }: StoriesIndexProps) {
  const { settings, updateSetting, applyPreset } = useReaderSettings();
  const [continueHref, setContinueHref] = useState("");
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentStoriesIndexLocale());
  const copy = getStoriesIndexCopy(locale);
  const story = stories[0];
  const stars = useMemo(() => generateStars(34), []);
  const readerBodyFontOptions = useMemo(() => getReaderBodyFontOptions(locale), [locale]);
  const readingPresetOptions = useMemo(() => getReadingPresetOptions(locale), [locale]);
  const selectedFont = readerBodyFontOptions.find((option) => option.id === settings.bodyFont) || readerBodyFontOptions[0] || READER_BODY_FONT_OPTIONS[0];
  const fontStyle = {
    "--story-font-display": READER_DISPLAY_FONT_STACK,
    "--story-font-body": selectedFont.family,
  } as CSSProperties;
  const sampleMinutes = story ? estimateReadingMinutes(story.description.length * 12) : 0;

  useEffect(() => {
    if (!story) return;
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      const progress = JSON.parse(raw)?.[story._id];
      if (progress?.lastChapterId) {
        setContinueHref(`/stories/${story.slug}/${progress.lastChapterId}`);
      }
    } catch (_) {}
  }, [story]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentStoriesIndexLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  return (
    <div className={styles.stage} style={fontStyle}>
      {/* ── Star Field ── */}
      <div className={styles.stars} aria-hidden="true">
        {stars.map((star, index) => (
          <span
            className={`${styles.star} ${star.twinkle ? styles.starTwinkle : ""}`}
            key={`story-star-${index}`}
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                "--star-opacity": star.opacity,
                "--twinkle-duration": `${star.duration}s`,
                "--twinkle-delay": `${star.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* ── Hero Banner ── */}
      <header className={styles.hero}>
        <div className={styles.moonAmbient} aria-hidden="true" />
        <div className={styles.moonOrb} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h1>
            <span>{copy.titlePrefix}</span>
            <strong>{copy.titleStrong}</strong>
          </h1>
          <p>{copy.introTop}<br />{copy.introBottom}</p>
          <div className={styles.divider} aria-hidden="true">
            <span />
            <b>◈</b>
            <span />
          </div>
          <div className={styles.entryRibbon} aria-label={copy.ribbonAria}>
            <span>{copy.ribbon}</span>
          </div>
        </div>
      </header>

      {/* ── Stats Strip ── */}
      {story && (
        <div className={styles.highlightStrip} aria-label={copy.statusAria}>
          <div className={styles.highlightItem}>
            <div className={styles.highlightValue}>{story.totalChapters}{copy.episodeSuffix}</div>
            <div className={styles.highlightLabel}>{copy.publishedChapters}</div>
          </div>
          <div className={styles.highlightItem}>
            <div className={styles.highlightValue}>{copy.free}</div>
            <div className={styles.highlightLabel}>{copy.freeAll}</div>
          </div>
          <div className={styles.highlightItem}>
            <div className={styles.highlightValue}>{sampleMinutes}{copy.minutesSuffix}</div>
            <div className={styles.highlightLabel}>{copy.readingEstimate}</div>
          </div>
        </div>
      )}

      {/* ── Featured / Grid ── */}
      {stories.length === 1 && story ? (
        <section className={styles.featuredLayout} aria-label={copy.featuredAria}>
          <article className={styles.featuredStoryCard}>
            {/* Cover visual block */}
            <div className={styles.storyCoverBlock} aria-hidden="true">
              <div className={styles.storyCoverMoon} />
              <div className={styles.storyCoverTitle}>
                <div className={styles.storyCoverEyebrow}>{copy.coverEyebrow}</div>
                <div className={styles.storyCoverName}>{story.title}</div>
              </div>
            </div>

            <span className={styles.featuredEyebrow}>{copy.serialNow}</span>
            <h2>{story.title}</h2>
            <p>{story.description}</p>
            <div className={styles.featuredMeta}>
              <span>{formatStoriesIndexText(copy.publishedMeta, { count: story.totalChapters })}</span>
              <span>{copy.freeMeta}</span>
              <span>{formatStoriesIndexText(copy.readingMeta, { minutes: sampleMinutes })}</span>
            </div>
            <div className={styles.featuredActions}>
              <Link href={continueHref || `/stories/${story.slug}`}>
                {continueHref ? copy.continue : copy.tableOfContents}
              </Link>
              <Link className={styles.secondaryAction} href={`/stories/${story.slug}/prologue`}>
                {copy.openPrologue}
              </Link>
            </div>
          </article>

          <aside className={styles.readerCard}>
            <div className={styles.readerCardHead}>
              <span className={styles.readerCardEyebrow}>{copy.settings}</span>
              <strong>{selectedFont.label}</strong>
            </div>
            <div
              className={styles.readerPreview}
              style={{ fontFamily: selectedFont.family, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
            >
              {copy.preview}
            </div>
            <div className={styles.readerStats}>
              <span>{settings.fontSize}px</span>
              <span>{settings.lineHeight.toFixed(2)} {copy.lineHeight}</span>
              <span>{readingPresetOptions.find((preset) => preset.id === settings.readingPreset)?.label || copy.relaxedPreset}</span>
            </div>
            <div className={styles.readerPresetRow}>
              {readingPresetOptions.map((preset) => (
                <button
                  className={`${styles.readerChip} ${settings.readingPreset === preset.id ? styles.readerChipActive : ""}`}
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className={styles.readerFontList}>
              {readerBodyFontOptions.map((option) => (
                <button
                  className={`${styles.readerFontButton} ${settings.bodyFont === option.id ? styles.readerFontButtonActive : ""}`}
                  key={option.id}
                  type="button"
                  onClick={() => updateSetting("bodyFont", option.id)}
                >
                  <strong>{option.label}</strong>
                  <span style={{ fontFamily: option.family }}>{option.preview}</span>
                </button>
              ))}
            </div>
            <div className={styles.readerScaleRow}>
              <button className={styles.readerScaleButton} type="button" onClick={() => updateSetting("fontSize", Math.max(14, settings.fontSize - 1))}>
                A−
              </button>
              <div className={styles.readerScaleTrack}>
                <span style={{ width: `${((settings.fontSize - 14) / 10) * 100}%` }} />
              </div>
              <button className={styles.readerScaleButton} type="button" onClick={() => updateSetting("fontSize", Math.min(24, settings.fontSize + 1))}>
                A+
              </button>
            </div>
          </aside>
        </section>
      ) : (
        <section className={styles.grid} aria-label={copy.gridAria}>
          {stories.map((item) => (
            <StoryCard key={item._id} story={item} />
          ))}
        </section>
      )}
    </div>
  );
}
