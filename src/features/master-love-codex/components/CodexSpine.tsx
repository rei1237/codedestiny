"use client";

/**
 * 코덱스 등뼈 — 상단에 고정되는 막 진행 레일.
 *
 * 현재 막만 금색, 나머지는 잉크 위 뮤트. 클릭하면 해당 막으로 스크롤한다.
 * 로마숫자는 ASCII(I~V) — Cinzel 이 커버하는 문자만 쓴다.
 */

import { CODEX_ACT_ANCHOR_PREFIX, CODEX_CHAPTER_ANCHOR_PREFIX, actsForMode, type CodexActMode } from "../data/acts";
import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import CodexAmbience from "./CodexAmbience";
import { masterLoveCodexBgmTracks } from "../data/assets";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexSpineProps {
  /** 현재 읽고 있는 막 (1~5) */
  activeOrder: number;
  /** 아직 생성되지 않은 막은 비활성 */
  availableOrders: number[];
  /** 막 제목 세트 — 궁합판은 관계 축 제목을 쓴다 */
  mode?: CodexActMode;
  chapters: Array<{ order: number; title: string }>;
}

export default function CodexSpine({ activeOrder, availableOrders, mode = "solo", chapters }: CodexSpineProps) {
  const copy = useMasterLoveCodexCopy();
  const available = new Set(availableOrders);
  const acts = actsForMode(mode);
  const contentsRef = useRef<HTMLDetailsElement | null>(null);

  function goToAct(order: number) {
    const target = document.getElementById(`${CODEX_ACT_ANCHOR_PREFIX}${order}`);
    if (!target) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav
      className={styles.readerNav}
      aria-label={copy.actNavAriaLabel}
    >
      <ol className={styles.actRail}>
        {acts.map((act) => {
          const isActive = act.order === activeOrder;
          const isReady = available.has(act.order);
          return (
            <li key={act.order} className="flex-1">
              <button
                type="button"
                onClick={() => goToAct(act.order)}
                disabled={!isReady}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${copy.actAriaLabel(act.numeral, act.title)}${isReady ? "" : copy.actNotReadySuffix}`}
                className={styles.actButton}
                style={{
                  color: isActive
                    ? "var(--codex-gold)"
                    : isReady
                      ? "var(--codex-ink-text-muted)"
                      : "rgba(185,173,153,.34)",
                }}
              >
                <span className="text-[0.9375rem] leading-none">{act.numeral}</span>
                <span className={styles.actButtonLabel}>{act.title}</span>
                <span
                  className="h-px w-full rounded-full transition-colors"
                  style={{
                    background: isActive
                      ? "var(--codex-gold)"
                      : isReady
                        ? "var(--codex-rule)"
                        : "rgba(232,213,163,.1)",
                  }}
                />
              </button>
            </li>
          );
        })}
      </ol>
      <div className={styles.readerNavTools}>
      <details ref={contentsRef} className={styles.readerContents} onKeyDown={event => {
        if (event.key === "Escape" && contentsRef.current?.open) {
          contentsRef.current.open = false;
          contentsRef.current.querySelector("summary")?.focus();
        }
      }}>
        <summary><span>{copy.readerContentsTitle}</span><span>{chapters.length}<ChevronDown size={16} aria-hidden="true" /></span></summary>
        <ol>
          {chapters.map(chapter => (
            <li key={chapter.order}>
              <a href={`#${CODEX_CHAPTER_ANCHOR_PREFIX}${chapter.order}`} onClick={event => {
                const target = document.getElementById(`${CODEX_CHAPTER_ANCHOR_PREFIX}${chapter.order}`);
                if (!target) return;
                event.preventDefault();
                if (contentsRef.current) contentsRef.current.open = false;
                target.focus({ preventScroll: true });
                target.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              }}>
                <span>{String(chapter.order).padStart(2, "0")}</span>
                {chapter.title.replace(/^제\s*\d+\s*장\s*·\s*/, "")}
              </a>
            </li>
          ))}
        </ol>
      </details>
      <CodexAmbience track={masterLoveCodexBgmTracks.reading} inline />
      </div>
    </nav>
  );
}
