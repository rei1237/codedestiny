"use client";

import type { CSSProperties } from "react";

export type SectionTab = { id: string; label: string };

/**
 * 섹션 탭 + 읽기 진행률.
 *
 * 탭 목록은 **실제로 마운트된 섹션**에서만 만든다(호출부가 걸러서 넘긴다). 구 리포트에는
 * 종합 결론·타임라인 섹션이 없으므로, 고정 목록을 쓰면 눌러도 아무 데도 가지 않는 탭이 생긴다.
 *
 * 진행률은 width 가 아니라 transform: scaleX() 로 움직인다(레이아웃 애니메이션 금지).
 */
export default function SectionTabs({
  tabs,
  activeId,
  progress,
  variant,
}: {
  tabs: SectionTab[];
  activeId: string;
  progress: number;
  variant: "rail" | "mobile";
}) {
  if (!tabs.length) return null;
  const ratio = Math.max(0, Math.min(1, progress));

  return (
    <nav
      className={`kdo-tabs kdo-tabs--${variant}`}
      style={{ "--kdo-progress": ratio } as CSSProperties}
      aria-label="리포트 섹션 이동"
    >
      {variant === "rail" && (
        <div className="kdo-tabs__meter">
          <span className="kdo-tabs__meter-label">읽은 분량</span>
          <span className="kdo-tabs__meter-track"><span className="kdo-tabs__meter-fill" /></span>
          <span className="kdo-tabs__meter-value">{Math.round(ratio * 100)}%</span>
        </div>
      )}
      <div className="kdo-tabs__list">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={`kdo-tabs__item ${active ? "is-active" : ""}`.trim()}
              aria-current={active ? "true" : undefined}
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
