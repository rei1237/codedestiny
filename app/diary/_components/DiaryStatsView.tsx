"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useDiaryToday } from "./DiaryStoreProvider";
import { diaryFlowCopy } from "../_lib/flow-copy";
import { buildDiaryRecordRows } from "../_lib/records";
import {
  DIARY_STATS_DEFAULT_RANGE,
  DIARY_STATS_RANGES,
  buildDiaryStats,
  type DiaryGrainStat,
  type DiaryStatsRange,
} from "../_lib/stats";
import styles from "../_styles/diary.module.css";

/**
 * 통계·결 대조. 내가 남긴 기록을 결 5등급별로 모아 본다.
 *
 * 🔴 여기서는 **쓰지 않는다** — 새로 저장하는 필드가 없고, 계산은 전부 `_lib/stats.ts` 에 있다
 * (이 파일은 그 결과를 그리기만 한다).
 *
 * 🔴 저장소를 다시 열지 않는다 — provider 스냅샷의 `store`·`ext`·`chart` 를 파생만 한다(원칙 6).
 * 🔴 원국 차트도 다시 만들지 않는다 — 하루 1회 계약(`lib/diary/fortune-adapter.ts:97`)이다.
 *
 * 🔴 숫자를 해석해 주지 않는다 — 「센 결에 성취가 높습니다」 같은 인과 문장을 쓰지 않는다.
 * 운기가 하루를 정하지 않는다는 것이 이 화면의 전제이고, 문안 가드
 * (`__tests__/ui/diary-copy-policy.test.js`)가 명리 용어와 단정 문형을 함께 막는다.
 */

const DIARY_STATS_TEXT = {
  ko: {
    title: "통계",
    loading: "기록을 불러오는 중입니다.",
    empty: "아직 셀 기록이 없습니다. 오늘 한 줄부터 적어 보세요.",
    rangeLabel: "기간 고르기",
    range: { d30: "최근 30일", d90: "90일", all: "전체" },
    sumWritten: "기록한 날",
    sumWrittenMeta: "일 중",
    sumStreak: "이어 쓴 날",
    sumAchieve: "성취 평균",
    sumTags: "남긴 태그",
    dayUnit: "일",
    countUnit: "개",
    grainTitle: "결 대조",
    grainLead:
      "운기가 하루를 정하지 않습니다. 같은 결로 표시된 날에 내가 남긴 것을 모아 본 것입니다.",
    grainShown: "표시",
    grainWritten: "기록",
    grainThin: "아직 비교할 기록이 적습니다.",
    grainMood: "자주 남긴 기분",
    grainMoodUnit: "회",
    grainRate: "만족도",
    noProfile: "생년월일을 등록하면 그날의 결과 함께 볼 수 있습니다.",
    moodTitle: "기분 분포",
    moodMeta: "남긴",
    weekTitle: "주별 성취",
    weekMeta: "루틴 + 할 일",
    weekMetaUnit: "주",
    tagTitle: "많이 쓴 태그",
    tagHint: "태그를 누르면 그 태그로 추린 기록 목록으로 갑니다.",
    note: "숫자는 내가 남긴 기록에서만 나옵니다. 기록이 3일 미만인 결은 비교하지 않습니다.",
  },
  en: {
    title: "Stats",
    loading: "Loading entries.",
    empty: "Nothing to count yet. Start with one line for today.",
    rangeLabel: "Pick a period",
    range: { d30: "Last 30 days", d90: "90 days", all: "All" },
    sumWritten: "Days written",
    sumWrittenMeta: "of",
    sumStreak: "Current streak",
    sumAchieve: "Progress",
    sumTags: "Tags used",
    dayUnit: " days",
    countUnit: "",
    grainTitle: "Grain view",
    grainLead:
      "The day's grain does not settle your day. This gathers what you wrote on days of the same grain.",
    grainShown: "Shown",
    grainWritten: "Written",
    grainThin: "Not enough entries to compare yet.",
    grainMood: "Most used mood",
    grainMoodUnit: "x",
    grainRate: "Rating",
    noProfile: "Register a birth date to see each day's grain alongside this.",
    moodTitle: "Mood spread",
    moodMeta: "Written",
    weekTitle: "Weekly progress",
    weekMeta: "Routines + to-dos",
    weekMetaUnit: " weeks",
    tagTitle: "Most used tags",
    tagHint: "Tap a tag to open the entry list filtered by it.",
    note: "These numbers come only from what you wrote. Grains with fewer than 3 entries are not compared.",
  },
} as const;

const copy = DIARY_STATS_TEXT.ko;

export default function DiaryStatsView() {
  const { hydrated, ymd, store, ext, chart } = useDiaryToday();
  const [range, setRange] = useState<DiaryStatsRange>(DIARY_STATS_DEFAULT_RANGE);

  const rows = useMemo(() => buildDiaryRecordRows(store, ext), [store, ext]);
  const stats = useMemo(
    () => buildDiaryStats(rows, chart, ymd, range),
    [rows, chart, ymd, range],
  );

  if (!hydrated) {
    return (
      <section className={styles.card} aria-label={copy.title}>
        <p className={styles.empty}>{copy.loading}</p>
      </section>
    );
  }

  const rangeRow = (
    <div className={styles.recFilters} role="group" aria-label={copy.rangeLabel}>
      {DIARY_STATS_RANGES.map((item) => (
        <button
          key={item}
          type="button"
          className={range === item ? styles.rangeChipOn : styles.rangeChip}
          aria-pressed={range === item}
          onClick={() => setRange(item)}
        >
          {copy.range[item]}
        </button>
      ))}
    </div>
  );

  if (rows.length === 0) {
    return (
      <>
        {rangeRow}
        <section className={styles.card} aria-label={copy.title}>
          <p className={styles.empty}>{copy.empty}</p>
        </section>
      </>
    );
  }

  return (
    <>
      {rangeRow}

      <div className={styles.statTiles}>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {stats.summary.written}
            <span className={styles.statUnit}>{copy.dayUnit}</span>
          </span>
          <span className={styles.statLabel}>
            {copy.sumWritten} · {stats.summary.span}
            {copy.sumWrittenMeta}
          </span>
        </p>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {stats.summary.streak}
            <span className={styles.statUnit}>{copy.dayUnit}</span>
          </span>
          <span className={styles.statLabel}>{copy.sumStreak}</span>
        </p>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {stats.summary.achieve}
            <span className={styles.statUnit}>%</span>
          </span>
          <span className={styles.statLabel}>{copy.sumAchieve}</span>
        </p>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {stats.summary.tags}
            <span className={styles.statUnit}>{copy.countUnit}</span>
          </span>
          <span className={styles.statLabel}>{copy.sumTags}</span>
        </p>
      </div>

      <section className={styles.card} aria-labelledby="diary-stats-grain">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="diary-stats-grain">
            {copy.grainTitle}
          </h2>
          <span className={styles.cardMeta}>{copy.range[range]}</span>
        </div>
        <p className={styles.emptySmall}>{copy.grainLead}</p>
        {stats.grains.length === 0 ? (
          <p className={styles.empty}>{copy.noProfile}</p>
        ) : (
          stats.grains.map((grain) => <GrainRow key={grain.tone} grain={grain} />)
        )}
      </section>

      {stats.moodDays > 0 ? (
        <section className={styles.card} aria-labelledby="diary-stats-mood">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="diary-stats-mood">
              {copy.moodTitle}
            </h2>
            <span className={styles.cardMeta}>
              {copy.moodMeta} {stats.moodDays}
              {copy.dayUnit}
            </span>
          </div>
          <div className={styles.moodRow}>
            {stats.moods.map((mood) => (
              <span key={mood.emoji} className={styles.moodItem}>
                <span className={styles.moodFace} aria-hidden="true">
                  {mood.emoji}
                </span>
                <span className={styles.moodTrack} aria-hidden="true">
                  <span
                    className={styles.moodFill}
                    style={{ width: `${barWidth(mood.count, stats.moodDays)}%` }}
                  />
                </span>
                <span className={styles.moodCount}>{mood.count}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {stats.weeks.length > 0 ? (
        <section className={styles.card} aria-labelledby="diary-stats-week">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="diary-stats-week">
              {copy.weekTitle}
            </h2>
            <span className={styles.cardMeta}>
              {copy.weekMeta} · {stats.weeks.length}
              {copy.weekMetaUnit}
            </span>
          </div>
          <div className={styles.weekRow}>
            {stats.weeks.map((week) => (
              <span key={week.start} className={styles.weekItem}>
                <span className={styles.weekPercent}>{week.percent}%</span>
                <span className={styles.weekTrack} aria-hidden="true">
                  <span className={styles.weekFill} style={{ height: `${week.percent}%` }} />
                </span>
                <span className={styles.weekLabel}>{week.label}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {stats.tags.length > 0 ? (
        <section className={styles.card} aria-labelledby="diary-stats-tag">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="diary-stats-tag">
              {copy.tagTitle}
            </h2>
            <span className={styles.cardMeta}>
              {stats.summary.tags}
              {copy.countUnit}
            </span>
          </div>
          <div className={styles.tagRank}>
            {stats.tags.map((item) => (
              <Link
                key={item.tag}
                href={`/diary/records/?tag=${encodeURIComponent(item.tag)}`}
                className={styles.tagChip}
              >
                {item.tag}
                <span className={styles.tagRankCount}>{item.count}</span>
              </Link>
            ))}
          </div>
          <p className={styles.emptySmall}>{copy.tagHint}</p>
        </section>
      ) : null}

      <p className={styles.statsNote}>{copy.note}</p>
    </>
  );
}

/** 막대 너비. 0 나눗셈을 여기 한 곳에서만 막는다. */
function barWidth(value: number, max: number): number {
  return max > 0 ? Math.round((Math.min(value, max) / max) * 100) : 0;
}

/**
 * 결 한 줄. 🔴 누르는 대상이 아니다 — 결로 날짜를 추리는 화면은 만들지 않았고(달력이 그 자리다),
 * 링크처럼 보이면 누를 곳을 찾게 된다.
 */
function GrainRow({ grain }: { grain: DiaryGrainStat }) {
  const flow = diaryFlowCopy(grain.tone);
  if (!flow) return null;

  return (
    <div className={`${styles.grainRow} ${styles[flow.step]}`}>
      <p className={styles.grainRowHead}>
        <i className={styles.recToneDot} aria-hidden="true" />
        <span className={styles.grainRowName}>{flow.name}</span>
        <span className={styles.grainRowMeta}>
          {copy.grainShown} {grain.shown}
          {copy.dayUnit} · {copy.grainWritten} {grain.written}
          {copy.dayUnit}
        </span>
      </p>

      {grain.enough ? (
        <>
          <p className={styles.grainBarRow}>
            <span className={styles.grainTrack} aria-hidden="true">
              <span className={styles.grainFill} style={{ width: `${grain.achieve || 0}%` }} />
            </span>
            <span className={styles.grainPercent}>{grain.achieve}%</span>
          </p>
          <p className={styles.grainRowFoot}>
            {grain.topMood ? (
              <span>
                {copy.grainMood} {grain.topMood.emoji} {grain.topMood.count}
                {copy.grainMoodUnit}
              </span>
            ) : null}
            {grain.rate !== null ? (
              <span>
                {copy.grainRate} {grain.rate.toFixed(1)} / 5
              </span>
            ) : null}
          </p>
        </>
      ) : (
        <p className={styles.grainRowThin}>{copy.grainThin}</p>
      )}
    </div>
  );
}
