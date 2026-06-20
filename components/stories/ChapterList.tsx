"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { estimateReadingMinutes, formatStoryCount } from "@/lib/stories/data";
import type { IChapter, IStory } from "@/lib/stories/types";
import styles from "./storyComponents.module.css";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
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
        <span className={styles.chapterFocusEyebrow}>지금 읽을 다음 화</span>
        <strong>
          {(() => {
            const currentIndex = chapters.findIndex((chapter) => chapter.slug === progress.lastChapterId);
            const currentRead = progress.lastChapterId ? Number(progress.readChapters?.[progress.lastChapterId] || 0) : 0;
            const nextChapter = currentIndex >= 0 && currentRead >= 85 ? chapters[currentIndex + 1] || chapters[currentIndex] : chapters[currentIndex] || chapters[0];
            return nextChapter?.title || "프롤로그. 이상한 앱이 깔렸다";
          })()}
        </strong>
        <span>
          {(() => {
            const currentIndex = chapters.findIndex((chapter) => chapter.slug === progress.lastChapterId);
            const currentRead = progress.lastChapterId ? Number(progress.readChapters?.[progress.lastChapterId] || 0) : 0;
            const nextChapter = currentIndex >= 0 && currentRead >= 85 ? chapters[currentIndex + 1] || chapters[currentIndex] : chapters[currentIndex] || chapters[0];
            if (!nextChapter) return "첫 장면부터 천천히 들어가 보세요.";
            return `${estimateReadingMinutes(nextChapter.wordCount)}분 호흡 · ${nextChapter.chapterNumber === 0 ? "프롤로그" : `${nextChapter.chapterNumber}화`}`;
          })()}
        </span>
      </div>
      {chapters.map((chapter) => {
        const readPercent = Number(progress.readChapters?.[chapter.slug] || 0);
        const isRead = readPercent >= 85;
        const isCurrent = progress.lastChapterId === chapter.slug;
        const statusLabel = isCurrent ? (isRead ? "읽음" : "읽는 중") : isRead ? "읽음" : "새로 읽기";
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
            <span className={styles.chapterNumber}>{chapter.chapterNumber === 0 ? "프롤로그" : `${chapter.chapterNumber}화`}</span>
            <span className={styles.chapterTitle}>
              <strong>{chapter.title}</strong>
              <span>{chapter.wordCount.toLocaleString("ko-KR")}자 · {estimateReadingMinutes(chapter.wordCount)}분</span>
            </span>
            <span className={`${styles.chapterMeta} ${styles.chapterMetaDate}`}>{formatDate(chapter.publishedAt)}</span>
            <span className={styles.chapterMeta}>
              <em className={`${styles.chapterState} ${isCurrent ? styles.chapterStateCurrent : isRead ? styles.chapterStateRead : ""}`}>{statusLabel}</em>
              <i>👁️ {formatStoryCount(displayViewCount)}</i>
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      const progress = JSON.parse(raw)?.[story._id];
      if (progress?.lastChapterId) setHref(`/stories/${story.slug}/${progress.lastChapterId}`);
    } catch (_) {}
  }, [story._id, story.slug]);

  if (!href) return null;

  return <Link href={href || fallbackHref}>이어읽기</Link>;
}

export function StoryProgressPanel({ story, chapters }: ChapterListProps) {
  const [progress, setProgress] = useState<StoredProgress>({});

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
        <span className={styles.progressEyebrow}>읽기 진행</span>
        <strong>{nextChapter ? nextChapter.title : "프롤로그. 이상한 앱이 깔렸다"}</strong>
        <p>
          {progress.lastChapterId
            ? `${currentChapter?.title || "프롤로그"}까지 이어졌습니다. 다음 흐름은 ${nextChapter?.chapterNumber === 0 ? "프롤로그" : `${nextChapter?.chapterNumber}화`}입니다.`
            : "아직 읽기 기록이 없습니다. 프롤로그부터 천천히 시작해 보세요."}
        </p>
      </div>
      <div className={styles.progressPanelStats}>
        <span>
          <b>{progress.lastChapterId ? currentChapter?.chapterNumber === 0 ? "프롤로그" : `${currentChapter?.chapterNumber}화` : "미시작"}</b>
          최근 읽은 화
        </span>
        <span>
          <b>{story.totalChapters}화</b>
          전체 화수
        </span>
        <span>
          <b>{totalMinutes}분</b>
          예상 전체 시간
        </span>
      </div>
    </div>
  );
}
