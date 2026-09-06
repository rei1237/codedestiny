"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DiaryDayView from "./DiaryDayView";
import { useDiaryToday } from "./DiaryStoreProvider";
import { diaryFlowCopy } from "../_lib/flow-copy";
import {
  formatKoreanDate,
  formatKoreanMonth,
  parseYmd,
  shiftMonth,
  weekdayLabel,
  type DiaryYearMonth,
} from "../_lib/kst-date";
import { buildDiaryMonthCells, monthYmds } from "../_lib/month-grid";
import { readMonthMarks } from "../_lib/month-marks";
import { readStoredEntry } from "../_lib/today-snapshot";
import { classifyDiaryDays, dayGroupOf, type DiaryDayFortune } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/diary.module.css";

/**
 * 달 달력. 🔴 **달력 자체는 쓰지 않는다** — 칸을 눌러 Day View 를 여는 것이 전부이고, 그날에
 * 쓰는 것은 Day View 의 기록·계획·회고 탭이다(PR-E). 저장 결과는 provider 의 `store` 가
 * 새 참조로 바뀌면서 이 화면의 표시(✎·✓·★)에 그대로 반영된다.
 *
 * 🔴 날짜 세그먼트 라우트를 만들지 않는다 — 프로덕션은 `next.config.mjs` 의 `output:"export"`
 * 라 `/diary/calendar/[ymd]` 는 빌드 시각에 존재하는 날짜만 나온다. 선택 날짜는 `?d=YYYY-MM-DD`
 * 쿼리 + 클라이언트 상태로 들고, 쿼리는 `history.replaceState` 로만 갱신한다
 * (`useSearchParams` 는 Suspense 경계를 요구하는데 여기서는 얻는 것이 없다).
 *
 * 🔴 저장소를 다시 열지 않는다 — 레이아웃의 `DiaryStoreProvider` 가 한 번 하이드레이션한
 * 스냅샷의 `store` 를 그대로 읽는다(원칙 6, 두 번째 리더를 만들지 않는다).
 * 🔴 원국 차트도 다시 만들지 않는다 — 스냅샷의 `chart` 를 그대로 넘긴다. 차트를 날짜마다
 * 다시 만들면 기준일 행운 오행이 갈려 셸 모달과 판정이 어긋난다(어댑터 주석 :91).
 */

const DIARY_CALENDAR_TEXT = {
  ko: {
    title: "달력",
    loading: "달력을 불러오는 중입니다.",
    prev: "이전 달",
    next: "다음 달",
    today: "오늘",
    noteDays: "기록",
    dayUnit: "일",
    done: "완료",
    legendGrain: "결",
    legendMark: "표시",
    markNote: "기록",
    markDone: "완료",
    markIam: "오늘의 나",
    markToday: "테두리 = 오늘",
  },
  en: {
    title: "Calendar",
    loading: "Loading the calendar.",
    prev: "Previous month",
    next: "Next month",
    today: "Today",
    noteDays: "Entries",
    dayUnit: " days",
    done: "Done",
    legendGrain: "Grain",
    legendMark: "Marks",
    markNote: "Entry",
    markDone: "Done",
    markIam: "Today's self",
    markToday: "Outline = today",
  },
} as const;

const copy = DIARY_CALENDAR_TEXT.ko;

/** 결 5등급 범례. 색만으로 구분하지 않으려고 이름을 함께 적는다(목업 승인본). */
const GRAIN_LEGEND = ["very-good", "good", "normal", "bad", "very-bad"] as const;

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function readRequestedYmd(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("d");
  return raw && parseYmd(raw) ? raw : null;
}

/** 🔴 `replaceState` 만 쓴다 — 날짜를 고를 때마다 히스토리가 쌓이면 뒤로가기가 달력에 갇힌다. */
function syncRequestedYmd(ymd: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (ymd) url.searchParams.set("d", ymd);
  else url.searchParams.delete("d");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function DiaryCalendarView() {
  const { hydrated, ymd: todayYmd, store, chart } = useDiaryToday();
  const [cursor, setCursor] = useState<DiaryYearMonth | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // 🔴 커서도 이펙트에서 정한다 — 렌더 중에 오늘이나 쿼리를 보면 프리렌더 결과와 어긋난다.
  useEffect(() => {
    if (!hydrated || !todayYmd) return;
    const requested = readRequestedYmd();
    const parts = parseYmd(requested || todayYmd);
    if (parts) setCursor({ year: parts.year, month: parts.month });
    setSelected(requested);
  }, [hydrated, todayYmd]);

  const cells = useMemo(
    () => (cursor ? buildDiaryMonthCells(cursor, todayYmd) : []),
    [cursor, todayYmd],
  );
  const ymds = useMemo(() => (cursor ? monthYmds(cursor) : []), [cursor]);
  const marks = useMemo(() => readMonthMarks(store, ymds), [store, ymds]);
  const fortunes = useMemo(() => {
    const byYmd: Record<string, DiaryDayFortune> = {};
    for (const day of classifyDiaryDays(chart, ymds)) byYmd[day.ymd] = day;
    return byYmd;
  }, [chart, ymds]);

  const moveMonth = useCallback((delta: number) => {
    setCursor((current) => (current ? shiftMonth(current, delta) : current));
  }, []);

  const select = useCallback((ymd: string) => {
    setSelected((current) => {
      const next = current === ymd ? null : ymd;
      syncRequestedYmd(next);
      return next;
    });
  }, []);

  const closeDay = useCallback(() => {
    setSelected(null);
    syncRequestedYmd(null);
  }, []);

  const selectedFortune = selected ? fortunes[selected] || null : null;

  return (
    <>
      <section className={styles.card} aria-label={copy.title}>
        <header className={styles.calHead}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => moveMonth(-1)}
            disabled={!cursor}
            aria-label={copy.prev}
          >
            ‹
          </button>
          <h2 className={styles.calMonth}>{cursor ? formatKoreanMonth(cursor) : copy.loading}</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => moveMonth(1)}
            disabled={!cursor}
            aria-label={copy.next}
          >
            ›
          </button>
        </header>

        <p className={styles.calMeta}>
          {`${copy.noteDays} ${marks.noteDays}${copy.dayUnit} · ${copy.done} ${marks.doneCount}`}
        </p>

        <div className={styles.dowRow} aria-hidden="true">
          {WEEKDAYS.map((index) => (
            <span key={index} className={index === 0 ? styles.dowSun : undefined}>
              {weekdayLabel(index)}
            </span>
          ))}
        </div>

        <div className={styles.monthGrid}>
          {cells.map((cell) => {
            if (!cell.ymd) {
              return (
                <span key={cell.key} className={`${styles.cell} ${styles.cellOut}`} aria-hidden="true">
                  <span className={styles.cellNum}>{cell.day}</span>
                </span>
              );
            }

            const grain = diaryFlowCopy(fortunes[cell.ymd]?.tone);
            const mark = marks.byYmd[cell.ymd];
            const className = [
              styles.cell,
              grain ? styles[grain.step] : "",
              cell.isSunday ? styles.cellSunday : "",
              cell.isToday ? styles.cellToday : "",
              selected === cell.ymd ? styles.cellSelected : "",
            ]
              .filter(Boolean)
              .join(" ");
            const label = [
              formatKoreanDate(cell.ymd),
              grain?.name,
              mark?.note ? copy.markNote : "",
              mark?.done ? copy.markDone : "",
              mark?.iam ? copy.markIam : "",
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <button
                key={cell.key}
                type="button"
                className={className}
                onClick={() => select(cell.ymd as string)}
                aria-pressed={selected === cell.ymd}
                aria-label={label}
              >
                <span className={styles.cellNum}>{cell.day}</span>
                <span className={styles.cellDot} aria-hidden="true" />
                <span className={styles.cellMarks} aria-hidden="true">
                  {mark?.note ? "✎" : ""}
                  {mark?.done ? "✓" : ""}
                  {mark?.iam ? <i className={styles.markStar}>★</i> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.legend}>
          <p className={styles.legendRow}>
            <span className={styles.legendKey}>{copy.legendGrain}</span>
            {GRAIN_LEGEND.map((tone) => {
              const grain = diaryFlowCopy(tone);
              if (!grain) return null;
              return (
                <span key={tone} className={`${styles.legendItem} ${styles[grain.step]}`}>
                  <i className={styles.legendDot} aria-hidden="true" />
                  {grain.name}
                </span>
              );
            })}
          </p>
          <p className={styles.legendRow}>
            <span className={styles.legendKey}>{copy.legendMark}</span>
            <span className={styles.legendItem}>✎ {copy.markNote}</span>
            <span className={styles.legendItem}>✓ {copy.markDone}</span>
            <span className={styles.legendItem}>
              <i className={styles.markStar}>★</i> {copy.markIam}
            </span>
            <span className={styles.legendItem}>{copy.markToday}</span>
          </p>
        </div>
      </section>

      {selected ? (
        <DiaryDayView
          ymd={selected}
          fortune={selectedFortune}
          group={dayGroupOf(chart, selected)}
          entry={readStoredEntry(store, selected)}
          onClose={closeDay}
        />
      ) : null}
    </>
  );
}
