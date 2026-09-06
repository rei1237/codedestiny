import styles from "./_styles/diary.module.css";

const DIARY_HOME_TEXT_TRANSLATIONS = {
  ko: {
    skeleton: "오늘의 흐름 · 오늘의 나 · 오늘의 계획 · 오늘의 기록 카드가 이 자리에 들어옵니다.",
  },
  en: {
    skeleton: "Today's flow, mood, plan, and entry cards will appear here.",
  },
} as const;

const diaryHomeCopy = DIARY_HOME_TEXT_TRANSLATIONS.ko;

/** 홈(오늘) 탭. 카드군은 PR-C 에서 붙는다 — 여기서는 셸이 서는지만 확인한다. */
export default function DiaryHomePage() {
  return <p className={styles.placeholder}>{diaryHomeCopy.skeleton}</p>;
}
