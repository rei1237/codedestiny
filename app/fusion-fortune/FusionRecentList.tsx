"use client";

/**
 * 지난 초융합 상담 다시 보기.
 *
 * 예전에는 결과가 어디에도 남지 않아 새로고침 한 번에 3만원짜리 리딩이 사라졌다. 이제
 * 완성된 결과는 계정에 남고, 이 목록이 그 입구다. 재열람에 추가 결제는 없다.
 *
 * 🔴 항목이 없으면 아무것도 렌더하지 않는다 — "아직 없습니다" 같은 빈 상태를 만들어
 * 처음 온 사람에게 없는 것을 약속하지 않는다.
 */

import { useFusionSharedCopy } from "./_lib/copy";
import styles from "./fusion-fortune.module.css";

export type FusionRecentItem = {
  id: string;
  title: string;
  topic?: string;
  createdAt?: string;
};

function formatDay(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

export function FusionRecentList({ items, activeId, busyId, onOpen }: {
  items: FusionRecentItem[];
  activeId: string;
  busyId: string;
  onOpen: (id: string) => void;
}) {
  const copy = useFusionSharedCopy();
  if (!items.length) return null;

  return (
    <section
      aria-label={copy.recentSectionAriaLabel}
      className="relative z-[2] mx-auto mb-[26px] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[rgba(200,177,235,0.27)] bg-[linear-gradient(145deg,rgba(24,19,48,0.94),rgba(13,11,29,0.97))]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b border-white/[0.07] px-5 py-5 sm:px-8">
        <h2 className={`m-0 ${styles.readingTitle} text-[1.16rem] text-[var(--fx-ink-1)]`}>{copy.recentHeading}</h2>
        <p className="m-0 text-[0.85rem] text-[var(--fx-ink-4)]">{copy.recentSubtext}</p>
      </div>
      <ul className="m-0 grid list-none gap-px bg-white/[0.06] p-0">
        {items.map((item) => {
          const current = item.id === activeId;
          return (
            <li key={item.id} className="bg-[var(--fx-deep)]">
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                disabled={Boolean(busyId)}
                aria-current={current ? "true" : undefined}
                className="flex min-h-[3.75rem] w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors hover:bg-white/[0.045] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:px-8"
              >
                <span className="min-w-0 flex-1 font-display text-[0.98rem] leading-snug text-[var(--fx-ink-1)]">
                  {item.title || copy.recentFallbackTitle}
                  {current && <em className="ml-2.5 rounded-full bg-[rgba(232,213,163,0.16)] px-2.5 py-0.5 align-middle text-[0.7rem] not-italic text-[var(--fx-gold)]">{copy.recentCurrentBadge}</em>}
                </span>
                {item.topic && <span className="text-[0.84rem] text-[var(--fx-ink-3)]">{item.topic}</span>}
                <span className="text-[0.82rem] tabular-nums text-[var(--fx-ink-4)]">{formatDay(item.createdAt)}</span>
                <span className="text-[0.84rem] font-bold text-[var(--fx-gold-2)]">{busyId === item.id ? copy.recentOpeningButton : copy.recentOpenButton}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
