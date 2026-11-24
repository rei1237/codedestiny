"use client";

// 대표 상담 3종 결과 화면의 챕터 리더(2026-11-24, FLAGSHIP_CHAPTER_READER_ENABLED 뒤에서만 마운트).
// 이 컴포넌트는 이미 화면에 그려진 저장 원본을 읽기만 한다 — 요청·결제·차감·생성을 하지 않는다.
// 장 이동은 호스트가 넘긴 onSelect(기존 목차 버튼과 같은 이동 로직)로만 하고, 본문 DOM 은 바꾸지 않는다.
// 글자 크기는 루트에 data-cd-reader-size 속성만 붙인다(보통이면 속성 없음 = 기존 화면 그대로).

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ProductMaster } from "@/app/components/ProductMasterStrip";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import styles from "./chapter-reader-dock.module.css";
import "./chapter-reader-size.css";

export type ReaderChapter = { key: string; title: string; kicker?: string; targetId: string };

type ReaderSize = "md" | "lg" | "xl";
const SIZES: readonly ReaderSize[] = ["md", "lg", "xl"];
const SIZE_LABEL: Record<ReaderSize, string> = { md: "보통", lg: "크게", xl: "아주 크게" };
const SIZE_KEY = "cd.readerFontSize.v1";
const pad = (value: number) => String(value).padStart(2, "0");

function readStoredSize(): ReaderSize {
  try {
    const stored = window.localStorage.getItem(SIZE_KEY);
    return (SIZES as readonly string[]).includes(stored ?? "") ? (stored as ReaderSize) : "md";
  } catch {
    return "md";
  }
}

function useKoreanReader() {
  const [korean, setKorean] = useState(() => getCurrentLoadingLocale() === "ko");
  useEffect(() => {
    const sync = () => setKorean(getCurrentLoadingLocale() === "ko");
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return korean;
}

export type ChapterReaderCover = { title: string; masters?: readonly ProductMaster[] };

export default function ChapterReaderDock({
  serviceName,
  chapters,
  rootSelector,
  onSelect,
  cover,
  clearSelector,
}: {
  serviceName: string;
  chapters: readonly ReaderChapter[];
  /** 글자 크기 속성을 붙이고 화면 안에 있는지 재는 결과 문서 루트. */
  rootSelector: string;
  /** 기존 목차 버튼과 같은 장 이동(한 장씩 보기면 쪽을 바꾸고 덱으로 스크롤). */
  onSelect: (index: number) => void;
  /** 결과 화면에 표지가 따로 없을 때만 넘긴다(인생의 책은 기존 표지를 쓴다). */
  cover?: ChapterReaderCover;
  /** 호스트가 화면 아래에 고정해 둔 자기 막대(예: 인생의 책 모바일 저장·공유 독). 고정돼 있을 때만 그 위로 올라간다. */
  clearSelector?: string;
}) {
  const korean = useKoreanReader();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ReaderSize>("md");
  const [lift, setLift] = useState(0);
  const openerRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const total = chapters.length;
  // 호스트가 렌더마다 새 배열을 넘겨도 스크롤 구독은 장 구성이 바뀔 때만 다시 건다.
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;
  const signature = chapters.map((chapter) => chapter.targetId).join("|");

  useEffect(() => {
    setMounted(true);
    setSize(readStoredSize());
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root || !korean) return;
    if (size === "md") root.removeAttribute("data-cd-reader-size");
    else root.setAttribute("data-cd-reader-size", size);
    return () => root.removeAttribute("data-cd-reader-size");
  }, [size, rootSelector, korean]);

  useEffect(() => {
    if (!korean || total < 2) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const root = document.querySelector(rootSelector);
      if (!root) { setVisible(false); return; }
      const viewport = window.innerHeight || 1;
      let current = -1;
      let firstTop = Number.POSITIVE_INFINITY;
      chaptersRef.current.forEach((chapter, index) => {
        const element = document.getElementById(chapter.targetId);
        // 한 장씩 보기에서 숨은 쪽(display:none)은 건너뛴다 — 보이는 쪽이 곧 지금 장이다.
        if (!element || element.getClientRects().length === 0) return;
        const top = element.getBoundingClientRect().top;
        firstTop = Math.min(firstTop, top);
        if (top <= viewport * 0.35) current = index;
      });
      setActive((previous) => (current >= 0 ? current : firstTop === Number.POSITIVE_INFINITY ? previous : 0));
      // 마지막 장이 짧으면 맨 위로 올려도 상담지 끝이 화면 절반 위에 있다 — 끝이 위 4분의 1을 지난 뒤에만 숨긴다.
      setVisible(firstTop < viewport * 0.9 && root.getBoundingClientRect().bottom > viewport * 0.25);
      // 호스트의 하단 고정 막대를 가리지 않는다 — 고정(position: fixed)일 때만 그 높이만큼 올린다.
      const clear = clearSelector ? document.querySelector<HTMLElement>(clearSelector) : null;
      const clearTop = clear && window.getComputedStyle(clear).position === "fixed" ? clear.getBoundingClientRect().top : viewport;
      setLift(Math.max(0, Math.round(viewport - clearTop)));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [signature, rootSelector, korean, total, clearSelector]);

  const select = useCallback((index: number) => {
    if (index < 0 || index >= total) return;
    setActive(index);
    onSelect(index);
  }, [onSelect, total]);

  const openSheet = () => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  };

  const closeSheet = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const current = sheetRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')
      || sheetRef.current?.querySelector<HTMLButtonElement>("button");
    current?.focus({ preventScroll: true });
    current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const onSheetKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); closeSheet(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLButtonElement>("button") || []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const cycleSize = () => {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length];
    setSize(next);
    try { window.localStorage.setItem(SIZE_KEY, next); } catch {}
  };

  if (!korean || total < 2) return null;
  const current = chapters[active] || chapters[0];

  return (
    <>
      {cover && (
        <section className={styles.cover} aria-label={`${serviceName} 상담지 표지`} data-pdf-skip="true">
          <p className={styles.coverEyebrow}>{serviceName} 상담지</p>
          <h2 className={styles.coverTitle}>{cover.title}</h2>
          {cover.masters?.length ? (
            <ul className={styles.coverMasters}>
              {cover.masters.map((master) => (
                <li key={master.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- ProductMasterStrip 과 같은 작은 아바타 */}
                  <img src={master.avatar} alt="" width={44} height={44} decoding="async" />
                  <span><strong>{master.name}</strong><small>{master.role}</small></span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className={styles.coverMeta}>{total}개의 장으로 엮은 상담지예요. 완료된 상담지는 내 기록에 남고, 다시 열어도 추가 결제나 차감이 없어요.</p>
          <div className={styles.coverActions}>
            <button type="button" className="cd-yehwa-button cd-yehwa-button--primary" onClick={() => select(0)}>첫 장부터 읽기</button>
            <button type="button" className={styles.coverLink} onClick={openSheet}>차례 보기</button>
          </div>
        </section>
      )}
      {mounted && createPortal(
        <>
          {visible && (
            <div
              className={styles.bar}
              role="toolbar"
              aria-label={`${serviceName} 읽기 도구`}
              data-lift={lift > 0 ? "true" : undefined}
              style={lift > 0 ? ({ "--cd-reader-lift": `${lift}px` } as CSSProperties) : undefined}
            >
              <button type="button" className={styles.tocTrigger} onClick={openSheet} aria-haspopup="dialog" aria-label={`차례 열기. 지금 ${active + 1}장 ${current.title}`}>
                <span className={styles.tocCount}>{pad(active + 1)}<span aria-hidden="true">/</span>{pad(total)}</span>
                <span className={styles.tocTitle}>{current.title}</span>
              </button>
              <button type="button" className={styles.step} onClick={() => select(active - 1)} disabled={active === 0} aria-label="이전 장">‹</button>
              <button type="button" className={styles.step} onClick={() => select(active + 1)} disabled={active >= total - 1} aria-label="다음 장">›</button>
              <button type="button" className={styles.size} onClick={cycleSize} aria-label={`글자 크기 ${SIZE_LABEL[size]}. 눌러서 바꾸기`}>
                <span aria-hidden="true">가</span><small>{SIZE_LABEL[size]}</small>
              </button>
            </div>
          )}
          {open && (
            <div className={styles.layer}>
              <button type="button" className={styles.backdrop} aria-label="차례 닫기" tabIndex={-1} onClick={closeSheet} />
              <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onSheetKeyDown}>
                <div className={styles.sheetHead}>
                  <h2 id={titleId} className={styles.sheetTitle}>{serviceName} 차례</h2>
                  <button type="button" className={styles.sheetClose} onClick={closeSheet}>닫기</button>
                </div>
                <ol className={styles.sheetList}>
                  {chapters.map((chapter, index) => (
                    <li key={chapter.key}>
                      <button
                        type="button"
                        className={styles.sheetItem}
                        aria-current={index === active ? "true" : undefined}
                        onClick={() => { closeSheet(); select(index); }}
                      >
                        <span className={styles.sheetNo}>{pad(index + 1)}</span>
                        <span className={styles.sheetText}>
                          {chapter.kicker ? <small>{chapter.kicker}</small> : null}
                          {chapter.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </>
  );
}
