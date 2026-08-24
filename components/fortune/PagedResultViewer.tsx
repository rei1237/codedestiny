"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import styles from "./paged-result-viewer.module.css";
import { currentFortuneSharedCopy } from "./_lib/fortune-shared-copy";

// 🔴 이 껍데기가 한국어면, 본문이 일본어인 작명첩에서도 넘김 버튼만 한국어로 남는다.
//    언어 전환은 경로 이동이라 렌더 시점에 한 번 읽으면 충분하다(_lib/fortune-shared-copy.ts 주석).
const COPY = currentFortuneSharedCopy();

export type ResultBreakImage = {
  src: string;
  width: number;
  height: number;
  className?: string;
};

export type ResultViewerPage = {
  id: string;
  label?: string;
  content: ReactNode;
  breakImage?: ResultBreakImage;
};

type PagedResultViewerProps = {
  pages: ResultViewerPage[];
  /** 덱 aria-label. 예: "1차 작전 브리핑" */
  deckLabel: string;
  className?: string;
  pageClassName?: string;
  /** 전체 보기(스크롤) 모드 — 컨트롤드. 토글 UI는 뷰어가 렌더링한다. */
  viewAll: boolean;
  onViewAllChange: (viewAll: boolean) => void;
  /** PDF 캡처용: 전 페이지를 펼치고 내비/토글을 숨긴다. */
  expandForExport?: boolean;
  initialPage?: number;
  /** 외부(목차 등)에서 페이지를 이동시킬 때 사용 — 값이 바뀌면 해당 페이지로 이동한다. */
  activePage?: number;
  onPageChange?: (index: number) => void;
  /** 페이지 하단 부가 요소(예: CTA). 페이지 인덱스별로 렌더링. */
  renderPageExtras?: (index: number) => ReactNode;
};

const SWIPE_THRESHOLD_PX = 60;

/** 전체 보기 선호를 localStorage에 기억하는 컨트롤드 상태 훅. */
export function usePagedViewerMode(storageKey = "fortunePagedViewerModeV1"): [boolean, (viewAll: boolean) => void] {
  const [viewAll, setViewAll] = useState(false);
  useEffect(() => {
    try {
      setViewAll(window.localStorage.getItem(storageKey) === "all");
    } catch {
      // 저장소 접근 불가 시 기본값(한 장씩) 유지
    }
  }, [storageKey]);
  const update = useCallback((next: boolean) => {
    setViewAll(next);
    try {
      window.localStorage.setItem(storageKey, next ? "all" : "paged");
    } catch {
      // best-effort
    }
  }, [storageKey]);
  return [viewAll, update];
}

export default function PagedResultViewer({
  pages,
  deckLabel,
  className = "",
  pageClassName = "",
  viewAll,
  onViewAllChange,
  expandForExport = false,
  initialPage = 0,
  activePage,
  onPageChange,
  renderPageExtras,
}: PagedResultViewerProps) {
  const [current, setCurrent] = useState(() => Math.min(Math.max(initialPage, 0), Math.max(pages.length - 1, 0)));
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const pointerStartX = useRef<number | null>(null);
  const total = pages.length;
  const showAll = viewAll || expandForExport;

  useEffect(() => {
    if (current > total - 1) setCurrent(Math.max(total - 1, 0));
  }, [current, total]);

  useEffect(() => {
    if (typeof activePage !== "number") return;
    const clamped = Math.min(Math.max(activePage, 0), total - 1);
    setCurrent((prev) => {
      if (clamped === prev) return prev;
      setDirection(clamped > prev ? "next" : "prev");
      return clamped;
    });
  }, [activePage, total]);

  const goTo = useCallback((index: number) => {
    const clamped = Math.min(Math.max(index, 0), total - 1);
    setCurrent((prev) => {
      if (clamped === prev) return prev;
      setDirection(clamped > prev ? "next" : "prev");
      onPageChange?.(clamped);
      return clamped;
    });
  }, [onPageChange, total]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (showAll) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1);
    }
  }, [current, goTo, showAll]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX;
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (showAll || pointerStartX.current == null) return;
    const deltaX = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    goTo(deltaX < 0 ? current + 1 : current - 1);
  }, [current, goTo, showAll]);

  if (!total) return null;

  return (
    <div className={`${styles.viewer} ${className}`.trim()} data-export={expandForExport ? "true" : "false"}>
      {!expandForExport ? (
        <div className={styles.modeToggle} role="group" aria-label={COPY.viewModeGroupAria}>
          <button type="button" aria-pressed={!viewAll} onClick={() => onViewAllChange(false)}>{COPY.viewOneByOne}</button>
          <button type="button" aria-pressed={viewAll} onClick={() => onViewAllChange(true)}>{COPY.viewAll}</button>
        </div>
      ) : null}
      <div
        className={styles.deck}
        data-view={showAll ? "all" : "paged"}
        data-dir={direction}
        role="region"
        aria-roledescription={COPY.pagerRoleDescription}
        aria-label={deckLabel}
        tabIndex={showAll ? -1 : 0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {pages.map((page, index) => {
          const active = showAll || index === current;
          return (
            <div
              key={page.id}
              className={`${styles.page} ${pageClassName}`.trim()}
              data-active={active ? "true" : "false"}
              aria-hidden={active ? undefined : "true"}
            >
              {page.content}
              {page.breakImage ? (
                <figure className={`${styles.breakImage} ${page.breakImage.className || ""}`.trim()} aria-hidden="true">
                  <Image
                    src={page.breakImage.src}
                    width={page.breakImage.width}
                    height={page.breakImage.height}
                    alt=""
                    loading="lazy"
                  />
                </figure>
              ) : null}
              {renderPageExtras?.(index)}
            </div>
          );
        })}
      </div>
      {!showAll ? (
        <nav className={styles.pageNav} aria-label={COPY.pageNavAria(deckLabel)}>
          <button type="button" aria-label={COPY.prevPageAria} disabled={current === 0} onClick={() => goTo(current - 1)}>
            {COPY.prevPageLabel}
          </button>
          <span className={styles.pageIndicator} aria-live="polite">
            {pages[current]?.label ? `${pages[current].label} · ` : ""}{current + 1} / {total}
          </span>
          <button type="button" aria-label={COPY.nextPageAria} disabled={current === total - 1} onClick={() => goTo(current + 1)}>
            {COPY.nextPageLabel}
          </button>
        </nav>
      ) : null}
    </div>
  );
}
