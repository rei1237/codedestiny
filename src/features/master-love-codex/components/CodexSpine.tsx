"use client";

/**
 * 코덱스 등뼈 — 상단에 고정되는 막 진행 레일.
 *
 * 현재 막만 금색, 나머지는 잉크 위 뮤트. 클릭하면 해당 막으로 스크롤한다.
 * 로마숫자는 ASCII(I~V) — Cinzel 이 커버하는 문자만 쓴다.
 */

import { CODEX_ACT_ANCHOR_PREFIX, actsForMode, type CodexActMode } from "../data/acts";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexSpineProps {
  /** 현재 읽고 있는 막 (1~5) */
  activeOrder: number;
  /** 아직 생성되지 않은 막은 비활성 */
  availableOrders: number[];
  /** 막 제목 세트 — 궁합판은 관계 축 제목을 쓴다 */
  mode?: CodexActMode;
}

export default function CodexSpine({ activeOrder, availableOrders, mode = "solo" }: CodexSpineProps) {
  const copy = useMasterLoveCodexCopy();
  const available = new Set(availableOrders);
  const acts = actsForMode(mode);

  function goToAct(order: number) {
    const target = document.getElementById(`${CODEX_ACT_ANCHOR_PREFIX}${order}`);
    if (!target) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav
      className="sticky top-0 z-20 border-b border-[color:var(--codex-rule)] bg-[rgba(10,8,24,.82)] backdrop-blur-md"
      aria-label={copy.actNavAriaLabel}
    >
      <ol className="mx-auto flex max-w-[680px] items-center justify-center gap-1 px-[var(--codex-gutter)] py-3">
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
                className={`${styles.numeral} group flex w-full flex-col items-center gap-1.5 py-1 transition-colors disabled:cursor-not-allowed`}
                style={{
                  color: isActive
                    ? "var(--codex-gold)"
                    : isReady
                      ? "var(--codex-ink-text-muted)"
                      : "rgba(185,173,153,.34)",
                }}
              >
                <span className="text-[0.9375rem] leading-none">{act.numeral}</span>
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
    </nav>
  );
}
