"use client";

/**
 * 결과 차례 레일 + 읽기 진행선. 30,000자 결과에서 "어디까지 읽었고 어디로 가면 되나"를 답한다.
 *
 * - 레일(aside)은 데스크톱(lg 이상)에만 그린다. 그 아래는 진행선 + 하단 도킹 바(FusionResultDock)가 맡는다.
 * - 차례 데이터·활성 추적·이동은 `useFusionToc` 하나가 소유하고 레일과 도크가 그것을 함께 쓴다 —
 *   도크가 IntersectionObserver 를 따로 달지 않는다(CLAUDE.md 원칙 6).
 * - PDF 캡처 대상(`data-fusion-pdf-section`) 바깥에 있어 캡처에 섞이지 않는다.
 */

import { type RefObject } from "react";
import { tintVars, type Result } from "./fusion-thread";
import { FusionResultDock } from "./FusionResultDock";
import { readingMinutes } from "./_lib/reading";
import { useFusionToc } from "./_lib/toc";
import { useFusionSharedCopy } from "./_lib/copy";

export function FusionResultRail({ result, generating, exporting, onOpenSection, scopeRef }: {
  result: Result;
  /** 1단계만 도착했고 2단계 스트림이 도는 중. 차례 아래에 "2단계" 그룹이 붙는다. */
  generating: boolean;
  /** PDF 캡처 중 — 하단 도킹 바를 렌더하지 않는다. */
  exporting: boolean;
  onOpenSection: (key: string) => void;
  scopeRef: RefObject<HTMLElement | null>;
}) {
  const copy = useFusionSharedCopy();
  const toc = useFusionToc(result, scopeRef, onOpenSection);

  return <>
    <FusionResultDock toc={toc} generating={generating} exporting={exporting} hasVerdict={Boolean(result.finalVerdict)} />
    <aside aria-label={copy.railAriaLabel} className="sticky top-6 mt-9 hidden self-start gap-4 text-[0.84rem] lg:grid">
      {/* 읽기 진행선. 🔴 레일 **안**이다 — 예전에는 결과 section 기준 absolute 라 섹션 맨 위에
          박혀 있었고, 읽기 시작하면 화면 밖으로 밀려나 데스크톱에서는 사실상 안 보였다
          (2026-09-06 실측: 스크롤 4,755px 에서 top −229). 좁은 화면 진행선은 도크가 든다. */}
      <span aria-hidden className="pointer-events-none block h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        <em className="block h-full origin-left bg-[linear-gradient(90deg,var(--fx-violet),var(--fx-gold-2))] transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${toc.progress})` }} />
      </span>
      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.055] px-4 pb-3.5 pt-4">
        <p className="m-0 mb-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--fx-ink-4)]">{copy.statsHeading}</p>
        <dl className="m-0 grid gap-1.5 tabular-nums text-[var(--fx-ink-3)]">
          {([[copy.totalCharsLabel, copy.charsCount(toc.totalChars.toLocaleString())], [copy.readingTimeLabel, copy.minutesAbout(readingMinutes(toc.totalChars, copy.readingCharsPerMinute))], [copy.readPositionLabel, `${Math.round(toc.progress * 100)}%`]] as const).map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3"><dt className="m-0">{label}</dt><dd className="m-0 font-display text-[1.2rem] text-[var(--fx-ink-1)]">{value}</dd></div>
          ))}
        </dl>
      </div>
      <nav className="rounded-2xl border border-white/[0.09] bg-white/[0.055] px-2 pb-3 pt-4">
        <p className="m-0 mb-1.5 px-2 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--fx-ink-4)]">{copy.tocHeading}</p>
        <ol className="m-0 grid list-none p-0">
          {toc.items.map((item, index) => {
            const state = item.key === toc.activeKey ? "active" : index < toc.activeIndex ? "done" : "todo";
            const minutes = readingMinutes(item.chars, copy.readingCharsPerMinute);
            return <li key={item.key} style={tintVars(item.systemKey)}>
              <button
                type="button"
                aria-current={state === "active" ? "location" : undefined}
                onClick={() => toc.navigate(item)}
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
          {toc.pending.length > 0 && <>
            <li className="px-2 pb-1 pt-2.5 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--fx-ink-4)]">{generating ? copy.stageTwoGeneratingLabel : copy.stageTwoGroupLabel}</li>
            {toc.pending.map((item) => <li key={item.key} className="grid grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2.5 px-2 py-2 leading-[1.35] text-[var(--fx-ink-4)] opacity-85">
              <i aria-hidden className="size-2 rounded-full border border-dashed border-[var(--fx-ink-4)]" />
              <span className="truncate">{item.label}</span>
              <small className="text-[0.7rem]">{copy.pendingLabel}</small>
            </li>)}
          </>}
        </ol>
        {result.finalVerdict && <button
          type="button"
          onClick={() => toc.navigate({ key: "verdict", collapsible: false })}
          className="mt-2 block w-full rounded-[10px] border border-[rgba(232,213,163,0.34)] bg-[rgba(232,213,163,0.08)] px-3 py-2 text-center text-[0.82rem] font-medium text-[var(--fx-gold)] transition-colors hover:bg-[rgba(232,213,163,0.16)] motion-reduce:transition-none"
        >{copy.jumpToVerdictButton}</button>}
      </nav>
    </aside>
  </>;
}
