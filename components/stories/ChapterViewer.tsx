"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  READER_BODY_FONT_OPTIONS,
  READER_CONTENT_WIDTHS,
  READER_DISPLAY_FONT_STACK,
  useReaderSettings,
  type ReaderTheme,
} from "@/hooks/useReaderSettings";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import type { ChapterNav, IChapter, IStory } from "@/lib/stories/types";
import ReadingProgressBar from "./ReadingProgressBar";
import ViewerNavBar from "./ViewerNavBar";
import ViewerSettingsPanel from "./ViewerSettingsPanel";
import styles from "./viewer.module.css";

interface ChapterViewerProps {
  story: IStory;
  chapter: IChapter;
  prev: ChapterNav | null;
  next: ChapterNav | null;
}

interface StoredViewCounts {
  stories?: Record<string, number>;
  chapters?: Record<string, Record<string, number>>;
}

const themeTokens: Record<ReaderTheme, { bg: string; text: string; surface: string; accent: string }> = {
  dark: { bg: "#0a0818", text: "#e2d9f3", surface: "#13102a", accent: "#a78bfa" },
  light: { bg: "#faf7ff", text: "#1a1535", surface: "#f0ebff", accent: "#7c3aed" },
  starlight: { bg: "#050412", text: "#ddd6fe", surface: "#0d0b2a", accent: "#c4b5fd" },
};

const VIEW_COUNT_STORAGE_KEY = "cd-story-view-counts";
const VIEW_COUNT_EVENT = "cd-story-view-counts-updated";

function getScrollPercent(target: HTMLElement | null) {
  if (!target) return 0;
  const max = Math.max(1, target.scrollHeight - target.clientHeight);
  return Math.min(100, Math.max(0, (target.scrollTop / max) * 100));
}

function isDialogue(text: string) {
  return /^["“'‘「『]/.test(text.trim());
}

function isSystemLine(text: string) {
  return /^\[[^\]]+\]$/.test(text.trim());
}

function isSceneDivider(text: string) {
  const trimmed = text.trim();
  return trimmed === "***" || trimmed === "◈" || /^[-·•⋯…]{3,}$/.test(trimmed);
}

function formatChapterLabel(chapterNumber: number) {
  return chapterNumber === 0 ? "프롤로그" : `Chapter ${chapterNumber}`;
}

function incrementStoredViewCount(storyId: string, chapterSlug: string) {
  if (typeof window === "undefined") return;

  try {
    const dedupeKey = `${VIEW_COUNT_STORAGE_KEY}:${storyId}:${chapterSlug}`;
    const now = Date.now();
    const lastTracked = Number(window.sessionStorage.getItem(dedupeKey) || 0);
    if (now - lastTracked < 1200) return;
    window.sessionStorage.setItem(dedupeKey, String(now));

    const parsed = JSON.parse(window.localStorage.getItem(VIEW_COUNT_STORAGE_KEY) || "{}") as StoredViewCounts;
    const nextStories = { ...(parsed.stories || {}) };
    const nextChapters = { ...(parsed.chapters || {}) };
    const chapterViews = { ...(nextChapters[storyId] || {}) };

    nextStories[storyId] = Number(nextStories[storyId] || 0) + 1;
    chapterViews[chapterSlug] = Number(chapterViews[chapterSlug] || 0) + 1;
    nextChapters[storyId] = chapterViews;

    window.localStorage.setItem(
      VIEW_COUNT_STORAGE_KEY,
      JSON.stringify({
        stories: nextStories,
        chapters: nextChapters,
      }),
    );
    window.dispatchEvent(new CustomEvent(VIEW_COUNT_EVENT, { detail: { storyId, chapterSlug } }));
  } catch (_) {}
}

type ParagraphBlock =
  | { kind: "body"; text: string }
  | { kind: "dialogue"; text: string }
  | { kind: "system"; text: string }
  | { kind: "divider"; text: string };

export default function ChapterViewer({ story, chapter, prev, next }: ChapterViewerProps) {
  const { settings, updateSetting, resetSettings, applyPreset } = useReaderSettings();
  const { lastPosition, updateProgress } = useReadingProgress(story._id, chapter.slug, chapter.chapterNumber);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topHidden, setTopHidden] = useState(false);
  const [dockMuted, setDockMuted] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const restoredRef = useRef(false);

  const listHref = `/stories/${story.slug}`;

  const cycleTheme = useCallback(() => {
    const nextTheme = settings.theme === "dark" ? "light" : settings.theme === "light" ? "starlight" : "dark";
    updateSetting("theme", nextTheme);
  }, [settings.theme, updateSetting]);

  useEffect(() => {
    shellRef.current?.scrollTo({ top: 0, behavior: "auto" });
    restoredRef.current = false;
  }, [chapter._id]);

  useEffect(() => {
    incrementStoredViewCount(story._id, chapter.slug);
  }, [story._id, chapter.slug]);

  useEffect(() => {
    if (restoredRef.current || lastPosition <= 1) return;
    restoredRef.current = true;
    requestAnimationFrame(() => {
      const target = shellRef.current;
      if (!target) return;
      const max = Math.max(1, target.scrollHeight - target.clientHeight);
      target.scrollTo({ top: Math.round((max * lastPosition) / 100), behavior: "auto" });
    });
  }, [lastPosition]);

  useEffect(() => {
    const target = shellRef.current;
    if (!target) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onScroll = () => {
      const currentY = target.scrollTop;
      const movingDown = currentY > lastScrollYRef.current;
      setTopHidden(movingDown && currentY > 90);
      setDockMuted(movingDown && currentY > 160);
      lastScrollYRef.current = currentY;
      updateProgress(getScrollPercent(target));
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      target.removeEventListener("scroll", onScroll);
      document.body.style.overflow = previousOverflow;
      updateProgress(getScrollPercent(target));
    };
  }, [updateProgress]);

  const cssVars = useMemo(() => {
    const theme = themeTokens[settings.theme];
    const bodyFont = READER_BODY_FONT_OPTIONS.find((option) => option.id === settings.bodyFont)?.family || READER_BODY_FONT_OPTIONS[0].family;
    return {
      "--reader-bg": theme.bg,
      "--reader-text": theme.text,
      "--reader-surface": theme.surface,
      "--reader-accent": theme.accent,
      "--reader-font-size": `${settings.fontSize}px`,
      "--reader-line-height": String(settings.lineHeight),
      "--reader-body-font": bodyFont,
      "--reader-display-font": READER_DISPLAY_FONT_STACK,
      "--reader-width": READER_CONTENT_WIDTHS[settings.contentWidth],
    } as CSSProperties;
  }, [settings]);

  const blocks = useMemo(
    () =>
      chapter.content
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map<ParagraphBlock>((text) => {
          if (isSceneDivider(text)) return { kind: "divider", text };
          if (isSystemLine(text)) return { kind: "system", text };
          if (isDialogue(text)) return { kind: "dialogue", text };
          return { kind: "body", text };
        }),
    [chapter.content],
  );

  return (
    <main
      ref={shellRef}
      className={styles.shell}
      data-theme={settings.theme}
      style={cssVars}
      onPointerDown={() => setDockMuted(false)}
    >
      <ViewerNavBar
        chapterTitle={chapter.title}
        dockMuted={dockMuted}
        hidden={topHidden}
        listHref={listHref}
        next={next}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTheme={cycleTheme}
        prev={prev}
        storyTitle={story.title}
        theme={settings.theme}
      />
      <section className={styles.readerCanvas}>
        <ReadingProgressBar progress={lastPosition} />
        <article className={styles.content}>
        <header className={styles.chapterHead}>
          <span className={styles.chapterKicker}>{formatChapterLabel(chapter.chapterNumber)}</span>
          <h1>{chapter.title}</h1>
          <p className={styles.chapterMeta}>
            {story.title} · {chapter.wordCount.toLocaleString("ko-KR")}자
          </p>
        </header>
        {blocks.map((block, index) => {
          if (block.kind === "divider") {
            return (
              <div className={styles.sceneDivider} key={`${chapter._id}-${index}`}>
                <span />
                <b>◈</b>
                <span />
              </div>
            );
          }

          if (block.kind === "system") {
            return (
              <div className={styles.systemLine} key={`${chapter._id}-${index}`}>
                {block.text}
              </div>
            );
          }

          if (block.kind === "dialogue") {
            return (
              <p className={`${styles.paragraph} ${styles.dialogue}`} key={`${chapter._id}-${index}`}>
                <span data-dialogue>{block.text}</span>
              </p>
            );
          }

          return (
            <p className={styles.paragraph} key={`${chapter._id}-${index}`}>
              {block.text}
            </p>
          );
        })}
        </article>
      </section>
      <ViewerSettingsPanel
        onApplyPreset={applyPreset}
        onChange={updateSetting}
        onClose={() => setSettingsOpen(false)}
        onReset={resetSettings}
        open={settingsOpen}
        settings={settings}
      />
    </main>
  );
}
