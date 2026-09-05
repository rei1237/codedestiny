"use client";

/**
 * 모바일 결과 내비게이션 — 하단 도킹 바 + 차례 바텀시트. lg 이상에서는 레일이 그 자리를 대신하므로 숨는다.
 *
 * - 상단이 아니라 하단인 이유: 이 라우트는 chromeless 라 `MobileBottomNav` 가 렌더되지 않아 하단이 비어 있고,
 *   대신 `.cd-feature-nav`(뒤로·홈)가 좌상단에 고정으로 떠 있다(app/components/AppChrome.tsx).
 * - 차례 데이터·활성 추적·이동은 레일과 **같은 훅 하나**(useFusionToc)에서 온다 — 관찰자를 새로 달지 않는다(원칙 6).
 * - 스크롤 잠금·Esc·포커스 트랩도 새로 만들지 않고 `<dialog>` 기본 동작을 쓴다(원칙 6).
 * - `data-fusion-pdf-section` 바깥이라 PDF 캡처에 안 섞이고, 캡처 중에는 아예 렌더하지 않는다.
 */

import { useEffect, useRef, useState } from "react";
import { tintVars } from "./fusion-thread";
import { readingMinutes } from "./_lib/reading";
import { useFusionSharedCopy } from "./_lib/copy";
import type { FusionToc, TocItem } from "./_lib/toc";
import styles from "./fusion-fortune.module.css";

export function FusionResultDock({ toc, generating, exporting, hasVerdict }: {
  toc: FusionToc;
  /** 1단계만 도착했고 2단계 스트림이 도는 중. 시트 차례 아래에 "2단계" 그룹이 붙는다. */
  generating: boolean;
  exporting: boolean;
  hasVerdict: boolean;
}) {
  const copy = useFusionSharedCopy();
  const sheetRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  // 캡처가 시작되면 시트가 열려 있어도 닫는다 — 열린 modal 은 뒤 본문을 inert 로 만든다.
  useEffect(() => {
    if (exporting && sheetRef.current?.open) sheetRef.current.close();
  }, [exporting]);

  if (exporting) return null;

  const activeLabel = toc.items[toc.activeIndex]?.label || "";
  const percent = Math.round(toc.progress * 100);
  const remainingMinutes = readingMinutes(Math.round(toc.totalChars * (1 - toc.progress)), copy.readingCharsPerMinute);

  const go = (item: Pick<TocItem, "key" | "collapsible">) => {
    sheetRef.current?.close();
    toc.navigate(item);
  };

  return <div className="lg:hidden">
    <div
      role="group"
      aria-label={copy.dockAriaLabel}
      className="fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-[900] grid h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden rounded-2xl border border-white/[0.14] bg-[rgba(11,9,26,0.92)] pl-3.5 pr-2 backdrop-blur-md"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-white/[0.07]">
        <em className="block h-full origin-left bg-[linear-gradient(90deg,var(--fx-violet),var(--fx-gold-2))] transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${toc.progress})` }} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <b className="truncate text-[0.84rem] font-semibold text-[var(--fx-ink-1)]">{activeLabel}</b>
        <span className="truncate text-[0.72rem] tabular-nums text-[var(--fx-ink-4)]">{copy.progressRead(percent)}{remainingMinutes ? ` · ${copy.remainingAbout(remainingMinutes)}` : ""}</span>
      </span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { setOpen(true); sheetRef.current?.showModal(); }}
        className="min-h-10 shrink-0 rounded-xl border border-[rgba(232,213,163,0.42)] bg-[rgba(232,213,163,0.12)] px-3.5 text-[0.84rem] font-bold text-[var(--fx-gold)] transition-colors active:bg-[rgba(232,213,163,0.2)] motion-reduce:transition-none"
      >{copy.openTocButton}</button>
    </div>

    <dialog
      ref={sheetRef}
      aria-label={copy.tocHeading}
      className={styles.tocSheet}
      onClose={() => setOpen(false)}
      // 스크림 탭으로 닫기. 시트 안쪽 여백(10~12px)을 누른 것과 구분하려고 좌표까지 본다 —
      // ::backdrop 클릭은 target 이 dialog 자신이라 target 검사만으로는 둘이 같아 보인다.
      onClick={(event) => {
        const sheet = sheetRef.current;
        if (!sheet || event.target !== sheet) return;
        const rect = sheet.getBoundingClientRect();
        const outside = event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right;
        if (outside) sheet.close();
      }}
    >
      <form method="dialog" className="grid justify-items-center">
        <button aria-label={copy.closeSheetButton} className="flex h-6 w-16 cursor-pointer items-center justify-center border-0 bg-transparent p-0">
          <i aria-hidden className="block h-1 w-9 rounded-full bg-white/[0.22]" />
        </button>
      </form>

      <dl className="m-0 grid grid-cols-3 gap-2">
        {([[copy.totalCharsLabel, copy.charsCount(toc.totalChars.toLocaleString())], [copy.readingTimeLabel, copy.minutesAbout(readingMinutes(toc.totalChars, copy.readingCharsPerMinute))], [copy.readPositionLabel, `${percent}%`]] as const).map(([label, value]) => (
          <div key={label} className="grid gap-0.5 rounded-xl border border-white/[0.09] bg-white/[0.04] px-2.5 py-2.5">
            <dt className="m-0 text-[0.68rem] tracking-[0.12em] text-[var(--fx-ink-4)]">{label}</dt>
            <dd className="m-0 truncate font-display text-[1.06rem] tabular-nums text-[var(--fx-ink-1)]">{value}</dd>
          </div>
        ))}
      </dl>

      <ol className="m-0 grid list-none overflow-y-auto p-0">
        {toc.items.map((item, index) => {
          const state = item.key === toc.activeKey ? "active" : index < toc.activeIndex ? "done" : "todo";
          const minutes = readingMinutes(item.chars, copy.readingCharsPerMinute);
          return <li key={item.key} style={tintVars(item.systemKey)}>
            <button
              type="button"
              aria-current={state === "active" ? "location" : undefined}
              onClick={() => go(item)}
              className={`grid min-h-11 w-full grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] border-0 px-2.5 text-left text-[0.88rem] leading-[1.35] transition-colors active:bg-white/[0.06] motion-reduce:transition-none ${
                state === "active" ? "bg-[var(--tint-veil)] text-[var(--fx-ink-1)]" : state === "done" ? "bg-transparent text-[var(--fx-ink-4)]" : "bg-transparent text-[var(--fx-ink-3)]"
              }`}
            >
              <i aria-hidden className={`size-2 rounded-full bg-[color:var(--tint)] shadow-[0_0_0_2px_var(--tint-veil)] ${state === "done" ? "opacity-55" : ""}`} />
              <span className={`truncate ${state === "active" ? "text-[color:var(--tint-label)]" : ""}`}>{item.label}</span>
              <small className="text-[0.72rem] tabular-nums text-[var(--fx-ink-4)]">{state === "done" ? copy.readLabel : minutes ? copy.minutesAbout(minutes) : ""}</small>
            </button>
          </li>;
        })}
        {toc.pending.length > 0 && <>
          <li className="px-2.5 pb-1 pt-2.5 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--fx-ink-4)]">{generating ? copy.stageTwoGeneratingLabel : copy.stageTwoGroupLabel}</li>
          {toc.pending.map((item) => <li key={item.key} className="grid min-h-11 grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 text-[0.88rem] leading-[1.35] text-[var(--fx-ink-4)] opacity-55">
            <i aria-hidden className="size-2 rounded-full border border-dashed border-[var(--fx-ink-4)]" />
            <span className="truncate">{item.label}</span>
            <small className="text-[0.72rem]">{copy.pendingLabel}</small>
          </li>)}
        </>}
      </ol>

      {hasVerdict && <button
        type="button"
        onClick={() => go({ key: "verdict", collapsible: false })}
        className="min-h-11 rounded-xl border border-[rgba(232,213,163,0.34)] bg-[rgba(232,213,163,0.08)] px-3 text-[0.86rem] font-medium text-[var(--fx-gold)] transition-colors active:bg-[rgba(232,213,163,0.16)] motion-reduce:transition-none"
      >{copy.jumpToVerdictButton}</button>}
    </dialog>
  </div>;
}
