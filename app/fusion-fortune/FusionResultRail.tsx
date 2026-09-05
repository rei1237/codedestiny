"use client";

/**
 * 결과 차례 레일 + 읽기 진행선. 30,000자 결과에서 "어디까지 읽었고 어디로 가면 되나"를 답한다.
 *
 * - 데스크톱(lg 이상)에만 그린다. 그 아래는 진행선만 남고 차례는 Phase 3(모바일)에서 따로 짓는다.
 * - 활성 항목·진행률은 스크롤 높이가 아니라 **항목 인덱스**로 센다 — 본문 말풍선이
 *   content-visibility:auto 라 화면 밖 높이는 contain-intrinsic-size(420px)로 잡혀 높이 기반 진행률이 튄다.
 * - PDF 캡처 대상(`data-fusion-pdf-section`) 바깥에 있어 캡처에 섞이지 않는다.
 */

import { useEffect, useMemo, useState, type RefObject } from "react";
import { SECTION_KEYS, SECTION_SYSTEM_KEYS, tintVars, type Result } from "./fusion-thread";
import { countResultChars, countSectionChars, countTimingChars, countVerdictChars, readingMinutes } from "./_lib/reading";
import { useFusionSharedCopy } from "./_lib/copy";

/** collapsible: 접히는 섹션은 차례에서 누르면 먼저 펼친다 — 접힌 채 스크롤만 옮기면 제목 한 줄에 도착한다. */
type TocItem = { key: string; label: string; chars: number; systemKey: (typeof SECTION_SYSTEM_KEYS)[number]; collapsible: boolean };

export function FusionResultRail({ result, generating, onOpenSection, scopeRef }: {
  result: Result;
  /** 1단계만 도착했고 2단계 스트림이 도는 중. 차례 아래에 "2단계" 그룹이 붙는다. */
  generating: boolean;
  onOpenSection: (key: string) => void;
  scopeRef: RefObject<HTMLElement | null>;
}) {
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

  // 2단계에서 올 조각 중 아직 없는 것. 완성본이면 비어 있어 그룹이 안 그려진다.
  const pending = useMemo(() => [
    !result.executiveSummary && { key: "summary", label: copy.summaryShortLabel },
    !result.timingAndAction?.content && { key: "timing", label: copy.whenWhatSpeaker },
    !result.finalVerdict && { key: "verdict", label: copy.verdictShortLabel },
  ].filter((item): item is { key: string; label: string } => Boolean(item)), [result, copy]);

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

  const navigate = (item: TocItem) => {
    if (item.collapsible) onOpenSection(item.key);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // 접힌 섹션은 펼침이 렌더된 뒤에 위치가 정해진다 — 한 프레임 뒤에 이동한다.
    requestAnimationFrame(() => document.getElementById(`fusion-toc-${item.key}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  return <>
    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-0.5 bg-white/[0.06]">
      <em className="block h-full origin-left bg-[linear-gradient(90deg,var(--fx-violet),var(--fx-gold-2))] transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
    </span>
    <aside aria-label={copy.railAriaLabel} className="sticky top-6 mt-9 hidden self-start gap-4 text-[0.84rem] lg:grid">
      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.055] px-4 pb-3.5 pt-4">
        <p className="m-0 mb-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--fx-ink-4)]">{copy.statsHeading}</p>
        <dl className="m-0 grid gap-1.5 tabular-nums text-[var(--fx-ink-3)]">
          {([[copy.totalCharsLabel, copy.charsCount(totalChars.toLocaleString())], [copy.readingTimeLabel, copy.minutesAbout(readingMinutes(totalChars, copy.readingCharsPerMinute))], [copy.readPositionLabel, `${Math.round(progress * 100)}%`]] as const).map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3"><dt className="m-0">{label}</dt><dd className="m-0 font-display text-[1.2rem] text-[var(--fx-ink-1)]">{value}</dd></div>
          ))}
        </dl>
      </div>
      <nav className="rounded-2xl border border-white/[0.09] bg-white/[0.055] px-2 pb-3 pt-4">
        <p className="m-0 mb-1.5 px-2 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--fx-ink-4)]">{copy.tocHeading}</p>
        <ol className="m-0 grid list-none p-0">
          {items.map((item, index) => {
            const state = item.key === activeKey ? "active" : index < activeIndex ? "done" : "todo";
            const minutes = readingMinutes(item.chars, copy.readingCharsPerMinute);
            return <li key={item.key} style={tintVars(item.systemKey)}>
              <button
                type="button"
                aria-current={state === "active" ? "location" : undefined}
                onClick={() => navigate(item)}
                className={`grid w-full grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border-0 px-2 py-2 text-left leading-[1.35] transition-colors hover:bg-white/[0.06] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none ${
                  state === "active" ? "bg-[var(--tint-veil)] text-[var(--fx-ink-1)]" : state === "done" ? "bg-transparent text-[var(--fx-ink-4)]" : "bg-transparent text-[var(--fx-ink-3)]"
                }`}
              >
                <i aria-hidden className={`size-2 rounded-full bg-[color:var(--tint)] shadow-[0_0_0_2px_var(--tint-veil)] ${state === "done" ? "opacity-55" : ""}`} />
                <span className={`truncate ${state === "active" ? "text-[color:var(--tint-label)]" : ""}`}>{item.label}</span>
                <small className="text-[0.7rem] tabular-nums text-[var(--fx-ink-4)]">{state === "done" ? copy.readLabel : minutes ? copy.minutesAbout(minutes) : ""}</small>
              </button>
            </li>;
          })}
          {pending.length > 0 && <>
            <li className="px-2 pb-1 pt-2.5 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--fx-ink-4)]">{generating ? copy.stageTwoGeneratingLabel : copy.stageTwoGroupLabel}</li>
            {pending.map((item) => <li key={item.key} className="grid grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2.5 px-2 py-2 leading-[1.35] text-[var(--fx-ink-4)] opacity-55">
              <i aria-hidden className="size-2 rounded-full border border-dashed border-[var(--fx-ink-4)]" />
              <span className="truncate">{item.label}</span>
              <small className="text-[0.7rem]">{copy.pendingLabel}</small>
            </li>)}
          </>}
        </ol>
        {result.finalVerdict && <button
          type="button"
          onClick={() => navigate({ key: "verdict", label: "", chars: 0, systemKey: "fusion", collapsible: false })}
          className="mt-2 block w-full rounded-[10px] border border-[rgba(232,213,163,0.34)] bg-[rgba(232,213,163,0.08)] px-3 py-2 text-center text-[0.82rem] font-medium text-[var(--fx-gold)] transition-colors hover:bg-[rgba(232,213,163,0.16)] motion-reduce:transition-none"
        >{copy.jumpToVerdictButton}</button>}
      </nav>
    </aside>
  </>;
}
