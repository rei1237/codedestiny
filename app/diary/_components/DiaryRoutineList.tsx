"use client";

import { useDiaryWriter } from "./DiaryStoreProvider";
import { toggleRoutine } from "../_lib/entry-writes";
import type { DiaryLegacyEntry } from "../_lib/today-snapshot";
import styles from "../_styles/diary.module.css";

/**
 * 그날의 실천 목록. 누르면 완료를 넣고 뺀다(셸 `js/luck-sync-diary.js:2611-2632` 과 같은 동작).
 * 홈 「오늘의 계획」과 Day View 의 「계획」 탭이 같은 것을 쓴다.
 *
 * 🔴 목록을 여기서 만들지 않는다 — `challengeCatalog` 는 셸이 그날 채우는 것이고, 앱에서
 * 항목을 더하는 것은 PR-F 다. id 가 없는 항목은 완료를 넣을 자리가 없으므로 글로만 보여 준다.
 */
export default function DiaryRoutineList({
  ymd,
  entry,
  emptyText,
}: {
  ymd: string;
  entry: DiaryLegacyEntry | null;
  emptyText: string;
}) {
  const { updateEntry } = useDiaryWriter();
  const catalog = (entry?.challengeCatalog || []).filter((item) => item?.text);
  const doneIds = entry?.challenges || [];

  if (!catalog.length) return <p className={styles.emptySmall}>{emptyText}</p>;

  return (
    <ul className={styles.routineList}>
      {catalog.map((item, index) => {
        const done = item.id ? doneIds.includes(item.id) : false;
        const id = item.id;
        return (
          <li key={id || `${index}`}>
            <button
              type="button"
              className={done ? styles.routineDone : styles.routineItem}
              aria-pressed={done}
              disabled={!id}
              onClick={() => id && updateEntry(ymd, toggleRoutine(id))}
            >
              <span className={styles.routineMark} aria-hidden="true">
                {done ? "✓" : "○"}
              </span>
              <span>{item.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
