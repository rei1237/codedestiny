"use client";

/**
 * 결과 차례(TOC)의 단일 상태 소유자.
 *
 * 데스크톱 레일(FusionResultRail)과 모바일 도크(FusionResultDock)가 **이 훅 하나**를 공유한다 —
 * 도크가 IntersectionObserver·활성 추적을 따로 달면 같은 축의 장치가 둘이 된다(CLAUDE.md 원칙 6).
 * 활성 항목·진행률은 스크롤 높이가 아니라 **항목 인덱스**로 센다: 본문 말풍선이 content-visibility:auto 라
 * 화면 밖 높이가 contain-intrinsic-size(420px)로 잡혀 높이 기반 진행률이 튄다.
 */

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { SECTION_KEYS, SECTION_SYSTEM_KEYS, type Result } from "../fusion-thread";
import { countResultChars, countSectionChars, countTimingChars, countVerdictChars } from "./reading";
import { useFusionSharedCopy } from "./copy";

/** collapsible: 접히는 섹션은 차례에서 누르면 먼저 펼친다 — 접힌 채 스크롤만 옮기면 제목 한 줄에 도착한다. */
export type TocItem = { key: string; label: string; chars: number; systemKey: (typeof SECTION_SYSTEM_KEYS)[number]; collapsible: boolean };
export type PendingTocItem = { key: string; label: string };

export type FusionToc = {
  items: TocItem[];
  /** 2단계에서 올 조각 중 아직 없는 것. 완성본이면 비어 있어 그룹이 안 그려진다. */
  pending: PendingTocItem[];
  totalChars: number;
  activeKey: string;
  activeIndex: number;
  /** 0~1. 레일 상단 진행선·도크 진행선·"읽은 위치"가 같은 값을 쓴다. */
  progress: number;
  navigate: (item: Pick<TocItem, "key" | "collapsible">) => void;
};

export function useFusionToc(result: Result, scopeRef: RefObject<HTMLElement | null>, onOpenSection: (key: string) => void): FusionToc {
  const copy = useFusionSharedCopy();
  const [activeKey, setActiveKey] = useState("");

  const items = useMemo<TocItem[]>(() => {
    const list: TocItem[] = [{ key: "opening", label: copy.openingShortLabel, chars: (result.openingMessage || "").length, systemKey: "fusion", collapsible: false }];
    if (result.executiveSummary) list.push({ key: "summary", label: copy.summaryShortLabel, chars: result.executiveSummary.length, systemKey: "fusion", collapsible: false });
    if (result.visualization) list.push({ key: "visual", label: copy.sixSystemsDirectionSpeaker, chars: 0, systemKey: "fusion", collapsible: false });
    SECTION_KEYS.forEach((key, index) => {
      if (!result[key]?.content) return;
      const systemKey = SECTION_SYSTEM_KEYS[index];
      list.push({ key, label: systemKey === "fusion" ? copy.integratedShortLabel : copy.systemLabels[systemKey], chars: countSectionChars(result[key]), systemKey, collapsible: true });
    });
    if (result.timingAndAction?.content) list.push({ key: "timing", label: copy.whenWhatSpeaker, chars: countTimingChars(result.timingAndAction), systemKey: "fusion", collapsible: true });
    if (result.finalVerdict) list.push({ key: "verdict", label: copy.verdictShortLabel, chars: countVerdictChars(result.finalVerdict), systemKey: "fusion", collapsible: false });
    if (result.closingMessage) list.push({ key: "closing", label: copy.closingShortLabel, chars: result.closingMessage.length, systemKey: "fusion", collapsible: false });
    return list;
  }, [result, copy]);

  const pending = useMemo<PendingTocItem[]>(() => [
    !result.executiveSummary && { key: "summary", label: copy.summaryShortLabel },
    !result.timingAndAction?.content && { key: "timing", label: copy.whenWhatSpeaker },
    !result.finalVerdict && { key: "verdict", label: copy.verdictShortLabel },
  ].filter((item): item is PendingTocItem => Boolean(item)), [result, copy]);

  const totalChars = useMemo(() => countResultChars(result), [result]);
  const activeIndex = Math.max(0, items.findIndex((item) => item.key === activeKey));
  const progress = items.length > 1 ? activeIndex / (items.length - 1) : 0;

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope || typeof IntersectionObserver === "undefined") return;
    const anchors = Array.from(scope.querySelectorAll<HTMLElement>("[data-fusion-toc]"));
    if (!anchors.length) return;
    // 뷰포트 위쪽 40% 선을 지나는 앵커 중 가장 앞의 것이 "읽는 중"이다.
    const visible = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const key = entry.target.getAttribute("data-fusion-toc") || "";
        if (entry.isIntersecting) visible.add(key); else visible.delete(key);
      }
      const first = anchors.find((anchor) => visible.has(anchor.getAttribute("data-fusion-toc") || ""));
      if (first) setActiveKey(first.getAttribute("data-fusion-toc") || "");
    }, { rootMargin: "-10% 0px -60% 0px", threshold: 0 });
    anchors.forEach((anchor) => observer.observe(anchor));
    return () => observer.disconnect();
  }, [scopeRef, items]);

  const navigate = useCallback((item: Pick<TocItem, "key" | "collapsible">) => {
    if (item.collapsible) onOpenSection(item.key);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // 접힌 섹션은 펼침이 렌더된 뒤에 위치가 정해진다 — 한 프레임 뒤에 이동한다.
    requestAnimationFrame(() => document.getElementById(`fusion-toc-${item.key}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  }, [onOpenSection]);

  return { items, pending, totalChars, activeKey, activeIndex, progress, navigate };
}
