"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type SectionTab = { id: string; label: string };

interface SectionTabsCopy {
  navAriaLabel: string;
  readMeterLabel: string;
}

const SECTION_TABS_EN: SectionTabsCopy = {
  navAriaLabel: "Jump to report section",
  readMeterLabel: "Read so far",
};

const SECTION_TABS_COPY: Partial<Record<LoadingLocale, SectionTabsCopy>> = {
  ko: { navAriaLabel: "리포트 섹션 이동", readMeterLabel: "읽은 분량" },
  ja: { navAriaLabel: "レポートセクション移動", readMeterLabel: "既読の分量" },
  "zh-CN": { navAriaLabel: "报告章节跳转", readMeterLabel: "已读进度" },
  "zh-TW": { navAriaLabel: "報告章節跳轉", readMeterLabel: "已讀進度" },
  vi: { navAriaLabel: "Chuyển đến phần báo cáo", readMeterLabel: "Đã đọc" },
  hi: { navAriaLabel: "रिपोर्ट अनुभाग पर जाएं", readMeterLabel: "अब तक पढ़ा गया" },
  es: { navAriaLabel: "Ir a la sección del informe", readMeterLabel: "Leído hasta ahora" },
  fr: { navAriaLabel: "Aller à la section du rapport", readMeterLabel: "Lu jusqu'ici" },
  de: { navAriaLabel: "Zu Berichtsabschnitt springen", readMeterLabel: "Bisher gelesen" },
  nl: { navAriaLabel: "Naar rapportsectie springen", readMeterLabel: "Tot nu toe gelezen" },
  ms: { navAriaLabel: "Lompat ke bahagian laporan", readMeterLabel: "Dibaca setakat ini" },
};

function getSectionTabsCopy(locale: LoadingLocale): SectionTabsCopy {
  return SECTION_TABS_COPY[locale] || SECTION_TABS_EN;
}

function useSectionTabsCopy(): SectionTabsCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getSectionTabsCopy(locale);
}

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
  const copy = useSectionTabsCopy();
  if (!tabs.length) return null;
  const ratio = Math.max(0, Math.min(1, progress));

  return (
    <nav
      className={`kdo-tabs kdo-tabs--${variant}`}
      style={{ "--kdo-progress": ratio } as CSSProperties}
      aria-label={copy.navAriaLabel}
    >
      {variant === "rail" && (
        <div className="kdo-tabs__meter">
          <span className="kdo-tabs__meter-label">{copy.readMeterLabel}</span>
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
