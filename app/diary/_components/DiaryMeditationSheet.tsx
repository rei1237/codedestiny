"use client";

import { useEffect } from "react";

import { useDiaryAudio } from "./DiaryAudioProvider";
import { useDiaryToday } from "./DiaryStoreProvider";
import { shiftYmd } from "../_lib/kst-date";
import { DIARY_MEDITATION_TRACKS } from "../_lib/meditation-tracks";
import { readStoredEntry, type DiaryLegacyStore } from "../_lib/today-snapshot";
import styles from "../_styles/diary.module.css";

/**
 * 명상 음악 시트. 🔴 **재생 자체는 여기 없다** — 셸의 `DiaryAudioProvider` 가 오디오를 들고 있고
 * 이 시트는 무엇을 틀지 고르기만 한다. 그래서 시트를 닫아도 음악이 이어진다.
 *
 * 🔴 「오늘 N분」은 **들은 시간**이다(프로바이더가 1분마다 쓴다). 셸처럼 곡을 여는 것만으로
 * 올라가지 않으므로, 목록을 훑기만 한 날은 0분으로 남는다 — 그게 맞다.
 * 🔴 퀵캡처 시트와 같은 규격이다: 스크림·바디 스크롤 락 없음, Escape 로 닫힌다.
 */

const DIARY_MEDITATION_TEXT = {
  ko: {
    title: "명상",
    close: "닫기",
    today: "오늘 들은 시간",
    week: "최근 7일",
    minute: "분",
    day: "일",
    order: "이어 재생",
    shuffle: "섞어 재생",
    playing: "재생 중",
    listLabel: "명상 음악 목록",
    hint: "1분을 들을 때마다 오늘의 기록에 쌓입니다.",
  },
  en: {
    title: "Meditation",
    close: "Close",
    today: "Listened today",
    week: "Last 7 days",
    minute: "min",
    day: "d",
    order: "Play in order",
    shuffle: "Shuffle",
    playing: "Playing",
    listLabel: "Meditation tracks",
    hint: "Every full minute you listen is added to today's entry.",
  },
} as const;

const copy = DIARY_MEDITATION_TEXT.ko;

/** 최근 7일 중 1분 이상 들은 날 수. 오늘을 포함한다. */
function countListenedDays(store: DiaryLegacyStore, ymd: string): number {
  if (!ymd) return 0;
  let days = 0;
  for (let back = 0; back < 7; back += 1) {
    const entry = readStoredEntry(store, shiftYmd(ymd, -back));
    if ((Number(entry?.meditationMinutes) || 0) > 0) days += 1;
  }
  return days;
}

export default function DiaryMeditationSheet({ onClose }: { onClose: () => void }) {
  const { hydrated, ymd, entry, store } = useDiaryToday();
  const { trackId, playing, toggle, playInOrder, playShuffled } = useDiaryAudio();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const minutes = Number(entry?.meditationMinutes) || 0;
  const days = hydrated ? countListenedDays(store, ymd) : 0;

  return (
    <aside className={styles.sheet} aria-label={copy.title}>
      <span className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHead}>
        <h2 className={styles.sheetTitle}>{copy.title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
          ✕
        </button>
      </header>

      {/* 🔴 0이어도 칸을 숨기지 않는다 — 칸이 사라지면 무엇을 안 세는지 알 수 없다. */}
      <div className={styles.statTiles}>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {minutes}
            <span className={styles.statUnit}>{copy.minute}</span>
          </span>
          <span className={styles.statLabel}>{copy.today}</span>
        </p>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {days}
            <span className={styles.statUnit}>{copy.day}</span>
          </span>
          <span className={styles.statLabel}>{copy.week}</span>
        </p>
      </div>

      <div className={styles.chipRow}>
        <button type="button" className={styles.chip} onClick={playInOrder}>
          {copy.order}
        </button>
        <button type="button" className={styles.chip} onClick={playShuffled}>
          {copy.shuffle}
        </button>
      </div>
      <p className={styles.emptySmall}>{copy.hint}</p>

      <ul className={styles.trackList} aria-label={copy.listLabel}>
        {DIARY_MEDITATION_TRACKS.map((track) => {
          const current = track.id === trackId;
          return (
            <li key={track.id} className={styles.trackItem}>
              <button
                type="button"
                className={current ? styles.trackRowOn : styles.trackRow}
                onClick={() => toggle(track.id)}
                aria-pressed={current && playing}
              >
                <span className={styles.trackIcon} aria-hidden="true">
                  {current && playing ? "❚❚" : "▶"}
                </span>
                <span className={styles.trackTitle}>{track.title}</span>
                {current && playing ? <span className={styles.trackNow}>{copy.playing}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
