"use client";

import { useEffect, useRef, useState } from "react";

import DiaryEntryFields from "./DiaryEntryFields";
import DiaryRetroPanel from "./DiaryRetroPanel";
import DiaryRoutineList from "./DiaryRoutineList";
import { buildDiaryDayDetail } from "../_lib/day-copy";
import { formatKoreanDate } from "../_lib/kst-date";
import { readDayMarks } from "../_lib/month-marks";
import type { DiaryDayFortune, DiaryDayGroup } from "@/lib/diary/fortune-adapter";
import type { DiaryLegacyEntry } from "../_lib/today-snapshot";
import styles from "../_styles/diary.module.css";

/**
 * 하루를 펼쳐 보는 시트. 요약은 읽기, 나머지 세 탭은 **그날에 바로 쓴다**(PR-E).
 * 🔴 쓰는 대상은 언제나 시트가 연 `ymd` 다 — 오늘이 아니다. 입력 칸은 홈과 같은 컴포넌트를
 * 쓰므로(`DiaryEntryFields`·`DiaryRoutineList`) 같은 필드가 두 화면에서 다르게 저장되지 않는다.
 *
 * 🔴 모달이 아니다 — 스크림도, 바디 스크롤 락도 걸지 않는다. `app/_lib/body-scroll-lock.ts`
 * 가 이 레포의 락 정본이고, 읽기 전용 peek 시트에 그것을 끌어오면 잠금 계층이 이중이 된다
 * (원칙 6). 그래서 시트는 자기 안에서만 스크롤하고 뒤 화면은 그대로 살아 있다.
 *
 * 문안은 `../_lib/day-copy.ts` 의 `buildDiaryDayDetail` 하나로 조립한다 — 홈 흐름 카드도
 * 같은 함수를 부르므로 같은 하루가 두 화면에서 다르게 읽히지 않는다.
 */

const DIARY_DAY_VIEW_TEXT = {
  ko: {
    label: "하루 자세히 보기",
    close: "닫기",
    tabs: { summary: "요약", record: "기록", plan: "계획", review: "회고" },
    pending: "준비 중입니다",
    schedule: "일정",
    todo: "할 일",
    routine: "루틴",
    routineEmpty: "이 날의 실천이 아직 없습니다.",
    grain: "결",
    mood: "기분",
    marks: "기록",
    stability: "안정",
    none: "—",
    markNote: "기록",
    markDone: "완료",
    markIam: "오늘의 나",
    flow: "흐름",
    care: "주의",
    focus: "지표",
    suggest: "추천",
    noProfile: "생년월일을 등록하면 이 날의 결이 여기에 표시됩니다.",
  },
  en: {
    label: "Day details",
    close: "Close",
    tabs: { summary: "Summary", record: "Entry", plan: "Plan", review: "Review" },
    pending: "Coming soon",
    schedule: "Schedule",
    todo: "To do",
    routine: "Routine",
    routineEmpty: "No practice items for this day yet.",
    grain: "Grain",
    mood: "Mood",
    marks: "Entries",
    stability: "Stability",
    none: "-",
    markNote: "Entry",
    markDone: "Done",
    markIam: "Today's self",
    flow: "Flow",
    care: "Care",
    focus: "Focus",
    suggest: "Try",
    noProfile: "Register a birth date and this day's grain will appear here.",
  },
} as const;

const copy = DIARY_DAY_VIEW_TEXT.ko;

const DAY_VIEW_TABS = [
  { key: "summary", label: copy.tabs.summary },
  { key: "record", label: copy.tabs.record },
  { key: "plan", label: copy.tabs.plan },
  { key: "review", label: copy.tabs.review },
] as const;

type DiaryDayTab = (typeof DAY_VIEW_TABS)[number]["key"];

interface DiaryDayViewProps {
  ymd: string;
  fortune: DiaryDayFortune | null;
  group: DiaryDayGroup | null;
  entry: DiaryLegacyEntry | null;
  onClose: () => void;
}

export default function DiaryDayView({ ymd, fortune, group, entry, onClose }: DiaryDayViewProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [tab, setTab] = useState<DiaryDayTab>("summary");
  const detail = buildDiaryDayDetail(fortune, group);
  const marks = readDayMarks(entry);

  // 🔴 날짜가 바뀌면 요약으로 되돌린다 — 다른 날의 기록 탭이 열린 채로 이어지면
  // 사용자는 방금 연 날에 쓰고 있다고 착각하기 쉽다.
  useEffect(() => {
    setTab("summary");
    closeRef.current?.focus();
  }, [ymd]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const markText = [
    marks.note ? copy.markNote : "",
    marks.done ? copy.markDone : "",
    marks.iam ? copy.markIam : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className={styles.sheet} aria-label={`${formatKoreanDate(ymd)} ${copy.label}`}>
      <span className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHead}>
        <h2 className={styles.sheetTitle}>{formatKoreanDate(ymd)}</h2>
        <button
          ref={closeRef}
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label={copy.close}
        >
          ✕
        </button>
      </header>

      <dl className={styles.sheetSummary}>
        <div className={styles.sumRow}>
          <dt className={styles.sumKey}>{copy.grain}</dt>
          <dd className={`${styles.sumValue} ${detail ? styles[detail.grade.step] : ""}`}>
            {detail ? (
              <>
                <span className={styles.grainDot} aria-hidden="true" />
                <span className={styles.grainName}>{detail.grade.name}</span>
                <span className={styles.grainScore}>
                  {copy.stability} {fortune?.goodness ?? copy.none}
                </span>
              </>
            ) : (
              copy.none
            )}
          </dd>
        </div>
        <div className={styles.sumRow}>
          <dt className={styles.sumKey}>{copy.mood}</dt>
          <dd className={styles.sumValue}>{entry?.moodEmoji || copy.none}</dd>
        </div>
        <div className={styles.sumRow}>
          <dt className={styles.sumKey}>{copy.marks}</dt>
          <dd className={styles.sumValue}>{markText || copy.none}</dd>
        </div>
      </dl>

      <div className={styles.dvTabs} role="tablist" aria-label={copy.label}>
        {DAY_VIEW_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`dv-tab-${item.key}`}
            aria-controls={`dv-panel-${item.key}`}
            className={styles.dvTab}
            aria-selected={item.key === tab}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 🔴 `key={ymd}` — 날짜가 바뀌면 입력 칸을 새로 만든다. 같은 칸을 재사용하면 저장 전
          초안이 다음 날짜의 칸에 그대로 남아, 어제 적던 글을 오늘 적은 것처럼 보여 준다
          (언마운트 때 흘려보내므로 적던 글은 적던 날짜에 저장된다). */}
      <div
        key={ymd}
        className={styles.dvPanel}
        role="tabpanel"
        id={`dv-panel-${tab}`}
        aria-labelledby={`dv-tab-${tab}`}
      >
        {tab === "summary" ? (
          detail ? (
            <ul className={styles.flowList}>
              <li>
                <span className={styles.flowKey}>{copy.flow}</span>
                <span className={styles.flowValue}>{detail.read}</span>
              </li>
              <li>
                <span className={styles.flowKey}>{copy.care}</span>
                <span className={`${styles.flowValue} ${styles.flowCare}`}>{detail.watch}</span>
              </li>
              {detail.focus ? (
                <li>
                  <span className={styles.flowKey}>{copy.focus}</span>
                  <span className={styles.flowValue}>{detail.focus}</span>
                </li>
              ) : null}
              <li>
                <span className={styles.flowKey}>{copy.suggest}</span>
                <span className={styles.flowValue}>{detail.suggest}</span>
              </li>
            </ul>
          ) : (
            <p className={styles.empty}>{copy.noProfile}</p>
          )
        ) : null}

        {tab === "record" ? <DiaryEntryFields ymd={ymd} entry={entry} /> : null}

        {tab === "plan" ? (
          <>
            <p className={styles.fieldLabel}>{copy.routine}</p>
            <DiaryRoutineList ymd={ymd} entry={entry} emptyText={copy.routineEmpty} />
            <p className={styles.fieldLabel}>{copy.schedule}</p>
            <p className={styles.emptySmall}>{copy.pending}</p>
            <p className={styles.fieldLabel}>{copy.todo}</p>
            <p className={styles.emptySmall}>{copy.pending}</p>
          </>
        ) : null}

        {tab === "review" ? <DiaryRetroPanel ymd={ymd} entry={entry} /> : null}
      </div>
    </aside>
  );
}
