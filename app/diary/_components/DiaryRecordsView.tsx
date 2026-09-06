"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useDiaryToday } from "./DiaryStoreProvider";
import { diaryFlowCopy } from "../_lib/flow-copy";
import { formatKoreanMonth, parseYmd, weekdayIndex, weekdayLabel } from "../_lib/kst-date";
import { buildDiaryRecordRows, collectDiaryTags, type DiaryRecordRow } from "../_lib/records";
import { classifyDiaryDays, type DiaryDayFortune } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/diary.module.css";

/**
 * 기록 목록. 남긴 것이 있는 날만 최신순으로 세우고, 카드를 누르면 그날의 Day View 로 간다.
 *
 * 🔴 여기서는 **쓰지 않는다** — 태그도 읽기 전용 표시다. 태그를 다는 자리는 Day View 「기록」
 * 탭 하나이고(승인본 확정 사항), 목록에서도 달 수 있게 하면 같은 것을 고치는 자리가 둘이 된다.
 *
 * 🔴 날짜 세그먼트 라우트를 만들지 않는다 — `output:"export"` 라 빌드 시각의 날짜만 나온다.
 * 달력과 같은 `?d=YYYY-MM-DD` 규약으로 넘긴다(`DiaryCalendarView` 가 그 쿼리를 읽어 시트를 연다).
 *
 * 🔴 저장소를 다시 열지 않는다 — provider 스냅샷의 `store`·`ext` 를 파생만 한다(원칙 6).
 */

const DIARY_RECORDS_TEXT = {
  ko: {
    title: "기록",
    loading: "기록을 불러오는 중입니다.",
    empty: "아직 남긴 기록이 없습니다. 오늘 한 줄부터 적어 보세요.",
    emptyTag: "이 태그로 남긴 날이 아직 없습니다.",
    filterAll: "전체",
    filterLabel: "태그로 추리기",
    more: "30일 더 보기",
    count: "기록",
    dayUnit: "일",
    achievement: "성취",
    noLine: "적은 한 줄이 없습니다.",
  },
  en: {
    title: "Entries",
    loading: "Loading entries.",
    empty: "Nothing written yet. Start with one line for today.",
    emptyTag: "No days with this tag yet.",
    filterAll: "All",
    filterLabel: "Filter by tag",
    more: "Show 30 more days",
    count: "Entries",
    dayUnit: " days",
    achievement: "Progress",
    noLine: "No line written.",
  },
} as const;

const copy = DIARY_RECORDS_TEXT.ko;

/** 한 번에 더 보여 주는 날 수. 목록은 스크롤이 유일한 이동 수단이라 한 걸음을 크게 둔다. */
const PAGE_SIZE = 30;

/** 통계의 태그 순위가 `?tag=` 로 넘긴다. 검색어와 달리 태그는 사용자가 고른 분류라 URL 에 둔다. */
function readRequestedTag(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("tag");
  return raw ? raw.trim() || null : null;
}

/** 🔴 달력과 같은 이유로 `replaceState` 만 쓴다 — 칩을 누를 때마다 히스토리가 쌓이면 뒤로가기가 갇힌다. */
function syncRequestedTag(tag: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function DiaryRecordsView() {
  const { hydrated, store, ext, chart } = useDiaryToday();
  const [tag, setTag] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // 🔴 쿼리도 이펙트에서 읽는다 — 렌더 중에 보면 프리렌더 결과와 어긋난다(달력과 같은 규약).
  useEffect(() => {
    if (!hydrated) return;
    setTag(readRequestedTag());
  }, [hydrated]);

  const rows = useMemo(() => buildDiaryRecordRows(store, ext), [store, ext]);
  const tags = useMemo(() => collectDiaryTags(rows), [rows]);
  const filtered = useMemo(
    () => (tag ? rows.filter((row) => row.tags.includes(tag)) : rows),
    [rows, tag],
  );
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  /* 결은 보이는 만큼만 계산한다 — 원국 차트는 provider 것을 그대로 쓴다(하루 1회 계약). */
  const fortunes = useMemo(() => {
    const byYmd: Record<string, DiaryDayFortune> = {};
    for (const day of classifyDiaryDays(chart, visible.map((row) => row.ymd))) {
      byYmd[day.ymd] = day;
    }
    return byYmd;
  }, [chart, visible]);

  /* 태그를 바꾸면 다시 처음부터 본다 — 필터를 좁혔는데 30일치가 그대로 열려 있으면
     "더 보기"가 무엇을 더 여는 것인지 읽히지 않는다. */
  const pickTag = (next: string | null) => {
    setTag(next);
    setLimit(PAGE_SIZE);
    syncRequestedTag(next);
  };

  if (!hydrated) {
    return (
      <section className={styles.card} aria-label={copy.title}>
        <p className={styles.empty}>{copy.loading}</p>
      </section>
    );
  }

  let lastMonth = "";

  return (
    <>
      {tags.length > 0 ? (
        <div className={styles.recFilters} role="group" aria-label={copy.filterLabel}>
          <button
            type="button"
            className={tag === null ? styles.tagChipOn : styles.tagChip}
            aria-pressed={tag === null}
            onClick={() => pickTag(null)}
          >
            {copy.filterAll}
          </button>
          {tags.map((item) => (
            <button
              key={item}
              type="button"
              className={tag === item ? styles.tagChipOn : styles.tagChip}
              aria-pressed={tag === item}
              onClick={() => pickTag(tag === item ? null : item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <p className={styles.recEmpty} role="status">
        {filtered.length === 0
          ? tag
            ? copy.emptyTag
            : copy.empty
          : `${copy.count} ${filtered.length}${copy.dayUnit}`}
      </p>

      {visible.map((row) => {
        const month = row.ymd.slice(0, 7);
        const monthHead = month === lastMonth ? null : month;
        lastMonth = month;
        return (
          <RecordGroup key={row.ymd} month={monthHead} row={row} fortune={fortunes[row.ymd] || null} />
        );
      })}

      {visible.length < filtered.length ? (
        <button type="button" className={styles.recMore} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          {copy.more}
        </button>
      ) : null}
    </>
  );
}

function RecordGroup({
  month,
  row,
  fortune,
}: {
  month: string | null;
  row: DiaryRecordRow;
  fortune: DiaryDayFortune | null;
}) {
  const parts = parseYmd(row.ymd);
  const grain = diaryFlowCopy(fortune?.tone);
  const percent = row.total > 0 ? Math.round((Math.min(row.done, row.total) / row.total) * 100) : 0;
  const monthParts = month ? parseYmd(`${month}-01`) : null;

  return (
    <>
      {monthParts ? (
        <p className={styles.recMonth}>
          {formatKoreanMonth({ year: monthParts.year, month: monthParts.month })}
        </p>
      ) : null}

      <Link
        href={`/diary/calendar/?d=${row.ymd}`}
        className={`${styles.recCard} ${grain ? styles[grain.step] : ""}`}
      >
        <span className={styles.recHead}>
          <span className={styles.recDate}>{parts ? `${parts.month}.${parts.day}` : row.ymd}</span>
          <span className={styles.recDow}>{weekdayLabel(weekdayIndex(row.ymd))}</span>
          {row.mood ? (
            <span className={styles.recMood} aria-hidden="true">
              {row.mood}
            </span>
          ) : null}
          {grain ? (
            <span className={styles.recTone}>
              <i className={styles.recToneDot} aria-hidden="true" />
              {grain.name}
            </span>
          ) : null}
        </span>

        <span className={styles.recLine}>{row.line || row.memo || copy.noLine}</span>

        {row.tags.length > 0 ? (
          <span className={styles.recTags}>
            {row.tags.map((item) => (
              <span key={item} className={styles.recTag}>
                {item}
              </span>
            ))}
          </span>
        ) : null}

        {row.total > 0 ? (
          <span className={styles.recFoot}>
            <span className={styles.recBar} aria-hidden="true">
              <span className={styles.recBarFill} style={{ width: `${percent}%` }} />
            </span>
            <span className={styles.recCount}>
              {copy.achievement} {row.done}/{row.total}
            </span>
          </span>
        ) : null}
      </Link>
    </>
  );
}
