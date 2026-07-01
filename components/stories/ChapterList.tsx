"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { estimateReadingMinutes } from "@/lib/stories/metrics";
import type { IChapter, IStory } from "@/lib/stories/types";
import styles from "./chapterList.module.css";

type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "es" | "fr" | "de";

interface ChapterListProps {
  story: IStory;
  chapters: IChapter[];
}

interface StoredProgress {
  lastChapterId?: string;
  scrollPosition?: number;
  lastChapterNumber?: number;
  readChapters?: Record<string, number>;
}

interface StoredViewCounts {
  stories?: Record<string, number>;
  chapters?: Record<string, Record<string, number>>;
}

const VIEW_COUNT_STORAGE_KEY = "cd-story-view-counts";
const VIEW_COUNT_EVENT = "cd-story-view-counts-updated";

function normalizeStoryLocale(value?: string | null): LoadingLocale {
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

function getCurrentStoryLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
  if (runtimeLanguage) return normalizeStoryLocale(runtimeLanguage);
  try {
    const stored = window.localStorage.getItem("cd_locale") || window.localStorage.getItem("code-destiny-locale");
    if (stored) return normalizeStoryLocale(stored);
  } catch (_) {}
  return normalizeStoryLocale(document.documentElement.lang || navigator.language);
}

const STORY_CHAPTER_TEXT_TRANSLATIONS = {
  ko: {
    nextReading: "지금 읽을 다음 화",
    defaultPrologueTitle: "프롤로그. 이상한 앱이 깔렸다",
    startFromFirstScene: "첫 장면부터 천천히 들어가 보세요.",
    minuteBreath: (minutes: number, chapter: string) => `${minutes}분 호흡 · ${chapter}`,
    prologue: "프롤로그",
    episode: (value: number) => `${value}화`,
    read: "읽음",
    reading: "읽는 중",
    startNew: "새로 읽기",
    characterCount: (value: string) => `${value}자`,
    minuteCount: (value: number) => `${value}분`,
    continueReading: "이어읽기",
    progress: "읽기 진행",
    progressContinued: (current: string, next: string) => `${current}까지 이어졌습니다. 다음 흐름은 ${next}입니다.`,
    noRecord: "아직 읽기 기록이 없습니다. 프롤로그부터 천천히 시작해 보세요.",
    notStarted: "미시작",
    recentChapter: "최근 읽은 화",
    totalChapters: "전체 화수",
    estimatedTotalTime: "예상 전체 시간",
    locale: "ko-KR",
  },
  en: {
    nextReading: "Next chapter to read",
    defaultPrologueTitle: "Prologue. A Strange App Was Installed",
    startFromFirstScene: "Ease in from the very first scene.",
    minuteBreath: (minutes: number, chapter: string) => `${minutes} min · ${chapter}`,
    prologue: "Prologue",
    episode: (value: number) => `Chapter ${value}`,
    read: "Read",
    reading: "Reading",
    startNew: "Start",
    characterCount: (value: string) => `${value} chars`,
    minuteCount: (value: number) => `${value} min`,
    continueReading: "Continue Reading",
    progress: "Reading Progress",
    progressContinued: (current: string, next: string) => `You have read through ${current}. The next flow is ${next}.`,
    noRecord: "No reading record yet. Begin gently from the prologue.",
    notStarted: "Not started",
    recentChapter: "Recent chapter",
    totalChapters: "Total chapters",
    estimatedTotalTime: "Estimated time",
    locale: "en-US",
  },
  ja: {
    nextReading: "次に読む話",
    defaultPrologueTitle: "プロローグ。不思議なアプリが入った",
    startFromFirstScene: "最初の場面からゆっくり入ってみてください。",
    minuteBreath: (minutes: number, chapter: string) => `${minutes}分の呼吸 · ${chapter}`,
    prologue: "プロローグ",
    episode: (value: number) => `${value}話`,
    read: "読了",
    reading: "読書中",
    startNew: "読む",
    characterCount: (value: string) => `${value}字`,
    minuteCount: (value: number) => `${value}分`,
    continueReading: "続きを読む",
    progress: "読書進行",
    progressContinued: (current: string, next: string) => `${current}まで読み進めました。次の流れは${next}です。`,
    noRecord: "まだ読書記録がありません。プロローグからゆっくり始めてください。",
    notStarted: "未開始",
    recentChapter: "最近読んだ話",
    totalChapters: "全話数",
    estimatedTotalTime: "予想所要時間",
    locale: "ja-JP",
  },
} as const;

function getStoryChapterCopy(locale: LoadingLocale) {
  return STORY_CHAPTER_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || STORY_CHAPTER_TEXT_TRANSLATIONS.ko;
}

function syncStoryLocale(setLocale: (locale: LoadingLocale) => void) {
  const syncLocale = () => setLocale(getCurrentStoryLocale());
  syncLocale();
  window.addEventListener("cd:locale-ready", syncLocale);
  window.addEventListener("cd:locale-change", syncLocale);
  window.addEventListener("storage", syncLocale);
  return () => {
    window.removeEventListener("cd:locale-ready", syncLocale);
    window.removeEventListener("cd:locale-change", syncLocale);
    window.removeEventListener("storage", syncLocale);
  };
}

function formatDate(value: string, locale: LoadingLocale) {
  return new Intl.DateTimeFormat(getStoryChapterCopy(locale).locale, {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatChapterNumber(value: number | undefined, locale: LoadingLocale) {
  const copy = getStoryChapterCopy(locale);
  return value === 0 || value === undefined ? copy.prologue : copy.episode(value);
}

function formatNumber(value: number, locale: LoadingLocale) {
  return value.toLocaleString(getStoryChapterCopy(locale).locale);
}

function formatViewCount(value: number, locale: LoadingLocale) {
  if (locale === "ko" && value >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return formatNumber(value, locale);
}

function readStoredChapterViews(storyId: string) {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIEW_COUNT_STORAGE_KEY) || "{}") as StoredViewCounts;
    return parsed.chapters?.[storyId] || {};
  } catch (_) {
    return {};
  }
}

export default function ChapterList({ story, chapters }: ChapterListProps) {
  const [progress, setProgress] = useState<StoredProgress>({});
  const [storedViews, setStoredViews] = useState<Record<string, number>>({});
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentStoryLocale());
  const copy = getStoryChapterCopy(locale);

  useEffect(() => syncStoryLocale(setLocale), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      setProgress(JSON.parse(raw)?.[story._id] || {});
    } catch (_) {}
  }, [story._id]);

  useEffect(() => {
    const syncStoredViews = () => {
      setStoredViews(readStoredChapterViews(story._id));
    };

    syncStoredViews();
    window.addEventListener(VIEW_COUNT_EVENT, syncStoredViews as EventListener);
    return () => {
      window.removeEventListener(VIEW_COUNT_EVENT, syncStoredViews as EventListener);
    };
  }, [story._id]);

  return (
    <div className={styles.chapterList}>
      <div className={styles.chapterFocusCard}>
        <span className={styles.chapterFocusEyebrow}>{copy.nextReading}</span>
        <strong>
          {(() => {
            const currentIndex = chapters.findIndex((chapter) => chapter.slug === progress.lastChapterId);
            const currentRead = progress.lastChapterId ? Number(progress.readChapters?.[progress.lastChapterId] || 0) : 0;
            const nextChapter = currentIndex >= 0 && currentRead >= 85 ? chapters[currentIndex + 1] || chapters[currentIndex] : chapters[currentIndex] || chapters[0];
            return nextChapter?.title || copy.defaultPrologueTitle;
          })()}
        </strong>
        <span>
          {(() => {
            const currentIndex = chapters.findIndex((chapter) => chapter.slug === progress.lastChapterId);
            const currentRead = progress.lastChapterId ? Number(progress.readChapters?.[progress.lastChapterId] || 0) : 0;
            const nextChapter = currentIndex >= 0 && currentRead >= 85 ? chapters[currentIndex + 1] || chapters[currentIndex] : chapters[currentIndex] || chapters[0];
            if (!nextChapter) return copy.startFromFirstScene;
            return copy.minuteBreath(estimateReadingMinutes(nextChapter.wordCount), formatChapterNumber(nextChapter.chapterNumber, locale));
          })()}
        </span>
      </div>
      {chapters.map((chapter) => {
        const readPercent = Number(progress.readChapters?.[chapter.slug] || 0);
        const isRead = readPercent >= 85;
        const isCurrent = progress.lastChapterId === chapter.slug;
        const statusLabel = isCurrent ? (isRead ? copy.read : copy.reading) : isRead ? copy.read : copy.startNew;
        const displayViewCount = chapter.viewCount + Number(storedViews[chapter.slug] || 0);

        return (
          <Link
            className={[
              styles.chapterRow,
              isRead ? styles.chapterRowRead : "",
              isCurrent ? styles.chapterRowCurrent : "",
            ].join(" ")}
            href={`/stories/${story.slug}/${chapter.slug}`}
            key={chapter._id}
          >
            <span className={styles.chapterNumber}>{formatChapterNumber(chapter.chapterNumber, locale)}</span>
            <span className={styles.chapterTitle}>
              <strong>{chapter.title}</strong>
              <span>{copy.characterCount(formatNumber(chapter.wordCount, locale))} · {copy.minuteCount(estimateReadingMinutes(chapter.wordCount))}</span>
            </span>
            <span className={`${styles.chapterMeta} ${styles.chapterMetaDate}`}>{formatDate(chapter.publishedAt, locale)}</span>
            <span className={styles.chapterMeta}>
              <em className={`${styles.chapterState} ${isCurrent ? styles.chapterStateCurrent : isRead ? styles.chapterStateRead : ""}`}>{statusLabel}</em>
              <i>👁️ {formatViewCount(displayViewCount, locale)}</i>
            </span>
            {isRead ? <span className={styles.readMark}>✓</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function ContinueReadingButton({ story, fallbackHref }: { story: IStory; fallbackHref: string }) {
  const [href, setHref] = useState("");
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentStoryLocale());
  const copy = getStoryChapterCopy(locale);

  useEffect(() => syncStoryLocale(setLocale), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      const progress = JSON.parse(raw)?.[story._id];
      if (progress?.lastChapterId) setHref(`/stories/${story.slug}/${progress.lastChapterId}`);
    } catch (_) {}
  }, [story._id, story.slug]);

  if (!href) return null;

  return <Link href={href || fallbackHref}>{copy.continueReading}</Link>;
}

export function StoryProgressPanel({ story, chapters }: ChapterListProps) {
  const [progress, setProgress] = useState<StoredProgress>({});
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentStoryLocale());
  const copy = getStoryChapterCopy(locale);

  useEffect(() => syncStoryLocale(setLocale), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      setProgress(JSON.parse(raw)?.[story._id] || {});
    } catch (_) {}
  }, [story._id]);

  const currentChapter = chapters.find((chapter) => chapter.slug === progress.lastChapterId) || chapters[0];
  const currentReadPercent = currentChapter ? Number(progress.readChapters?.[currentChapter.slug] || 0) : 0;
  const currentIndex = currentChapter ? chapters.findIndex((chapter) => chapter.slug === currentChapter.slug) : -1;
  const nextChapter = currentIndex >= 0 && currentReadPercent >= 85 ? chapters[currentIndex + 1] || currentChapter : currentChapter;
  const totalMinutes = chapters.reduce((sum, chapter) => sum + estimateReadingMinutes(chapter.wordCount), 0);

  return (
    <div className={styles.progressPanel}>
      <div className={styles.progressPanelCopy}>
        <span className={styles.progressEyebrow}>{copy.progress}</span>
        <strong>{nextChapter ? nextChapter.title : copy.defaultPrologueTitle}</strong>
        <p>
          {progress.lastChapterId
            ? copy.progressContinued(currentChapter?.title || copy.prologue, formatChapterNumber(nextChapter?.chapterNumber, locale))
            : copy.noRecord}
        </p>
      </div>
      <div className={styles.progressPanelStats}>
        <span>
          <b>{progress.lastChapterId ? formatChapterNumber(currentChapter?.chapterNumber, locale) : copy.notStarted}</b>
          {copy.recentChapter}
        </span>
        <span>
          <b>{copy.episode(story.totalChapters)}</b>
          {copy.totalChapters}
        </span>
        <span>
          <b>{copy.minuteCount(totalMinutes)}</b>
          {copy.estimatedTotalTime}
        </span>
      </div>
    </div>
  );
}
