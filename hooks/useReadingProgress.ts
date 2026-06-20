"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bookmark } from "@/lib/stories/types";

interface StoredReadingProgress {
  storyId: string;
  lastChapterId: string;
  lastChapterNumber: number;
  scrollPosition: number;
  readChapters: Record<string, number>;
  bookmarks: Bookmark[];
  updatedAt: string;
}

type ProgressStore = Record<string, StoredReadingProgress>;

const STORAGE_KEY = "cd-reading-progress";

function readStore(): ProgressStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_) {}
}

function clampPosition(position: number) {
  return Math.min(100, Math.max(0, Math.round(Number(position) || 0)));
}

export function useReadingProgress(storyId: string, chapterId: string, chapterNumber: number) {
  const [lastPosition, setLastPosition] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef(0);

  const saveProgress = useCallback(
    (position: number) => {
      const bounded = clampPosition(position);
      const store = readStore();
      const current = store[storyId] || {
        storyId,
        lastChapterId: chapterId,
        lastChapterNumber: chapterNumber,
        scrollPosition: 0,
        readChapters: {},
        bookmarks: [],
        updatedAt: new Date().toISOString(),
      };

      store[storyId] = {
        ...current,
        storyId,
        lastChapterId: chapterId,
        lastChapterNumber: chapterNumber,
        scrollPosition: bounded,
        readChapters: {
          ...(current.readChapters || {}),
          [chapterId]: Math.max(Number(current.readChapters?.[chapterId] || 0), bounded),
        },
        bookmarks: current.bookmarks || [],
        updatedAt: new Date().toISOString(),
      };
      writeStore(store);
      setBookmarks(store[storyId].bookmarks || []);
    },
    [chapterId, chapterNumber, storyId],
  );

  useEffect(() => {
    const store = readStore();
    const current = store[storyId];
    const restored = current?.lastChapterId === chapterId ? clampPosition(current.scrollPosition) : 0;
    positionRef.current = restored;
    setLastPosition(restored);
    setBookmarks(current?.bookmarks || []);
  }, [chapterId, storyId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      saveProgress(positionRef.current);
    };
  }, [saveProgress]);

  const updateProgress = useCallback(
    (position: number) => {
      const bounded = clampPosition(position);
      positionRef.current = bounded;
      setLastPosition(bounded);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => saveProgress(bounded), 500);
    },
    [saveProgress],
  );

  const addBookmark = useCallback(
    (note?: string) => {
      const store = readStore();
      const current = store[storyId] || {
        storyId,
        lastChapterId: chapterId,
        lastChapterNumber: chapterNumber,
        scrollPosition: positionRef.current,
        readChapters: {},
        bookmarks: [],
        updatedAt: new Date().toISOString(),
      };
      const nextBookmark: Bookmark = {
        storyId,
        chapterId,
        chapterNumber,
        scrollPosition: clampPosition(positionRef.current),
        note,
        createdAt: new Date().toISOString(),
      };
      const filtered = (current.bookmarks || []).filter((bookmark) => bookmark.chapterId !== chapterId);
      store[storyId] = {
        ...current,
        bookmarks: [...filtered, nextBookmark],
        updatedAt: new Date().toISOString(),
      };
      writeStore(store);
      setBookmarks(store[storyId].bookmarks);
    },
    [chapterId, chapterNumber, storyId],
  );

  const removeBookmark = useCallback(() => {
    const store = readStore();
    const current = store[storyId];
    if (!current) return;
    store[storyId] = {
      ...current,
      bookmarks: (current.bookmarks || []).filter((bookmark) => bookmark.chapterId !== chapterId),
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    setBookmarks(store[storyId].bookmarks);
  }, [chapterId, storyId]);

  const isBookmarked = useMemo(
    () => bookmarks.some((bookmark) => bookmark.chapterId === chapterId),
    [bookmarks, chapterId],
  );

  return {
    lastPosition,
    updateProgress,
    addBookmark,
    removeBookmark,
    isBookmarked,
    bookmarks,
  };
}
