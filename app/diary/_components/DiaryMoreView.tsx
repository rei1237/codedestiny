"use client";

import { useState } from "react";

import DiaryBackupPanel from "./DiaryBackupPanel";
import DiaryMeditationSheet from "./DiaryMeditationSheet";
import DiaryMindTrainingSheet from "./DiaryMindTrainingSheet";
import DiarySmallActionSheet from "./DiarySmallActionSheet";
import DiaryTodayCardSheet from "./DiaryTodayCardSheet";
import DiaryTogetherSheet from "./DiaryTogetherSheet";
import styles from "../_styles/diary.module.css";

/**
 * 더보기 허브. 매일 쓰지는 않지만 있어야 하는 것들의 입구다.
 *
 * 🔴 여기 있는 다섯 줄은 셸 모달(js/luck-sync-diary.js)에 이미 있는 기능의 자리다 —
 * 🔴 그 경로를 따옴표·백틱으로 감싸지 않는다 — `verify:shell-korean-calendar` ⑭ 가 감싼 것을
 * **스크립트 참조**로 읽어 `?v=` 없는 무버전 참조로 잡는다(로컬 게이트에는 없고 CI 에서만 터진다).
 * **지우고 옮기는 것이 아니라 이 앱에도 여는 것**이다(사용자 확정, 2026-09-06). 셸 쪽은 그대로 둔다.
 * 🔴 다섯 줄 모두 시트로 열린다 — 「준비 중」 자리는 남지 않는다.
 * 🔴 시트는 목록 바깥에 그린다 — 카드 안에 두면 그 카드가 만드는 쌓임 맥락에 갇힌다
 * (하단바가 ＋ 퀵캡처를 `<nav>` 밖에 두는 것과 같은 이유다).
 *
 * 🔴 「기록 전체 지우기」는 이 목록에 두지 않는다 — 데이터 칸 안에서 2단 확인 뒤에만 열린다.
 */

const MORE_TEXT = {
  ko: {
    sectionFeature: "챙겨 볼 것",
    items: [
      { key: "meditation", icon: "◯", label: "명상", desc: "숨을 고르는 시간을 재고 남깁니다." },
      { key: "training", icon: "❍", label: "마음 훈련", desc: "떠오른 장면과 한 문장을 적어 둡니다." },
      { key: "action", icon: "✓", label: "오늘의 작은 행동", desc: "오늘 하루에 얹을 한 가지를 고릅니다." },
      { key: "card", icon: "▧", label: "오늘 카드", desc: "하루에 한 장, 오늘을 여는 카드를 뽑습니다." },
      { key: "together", icon: "❑", label: "함께 보기", desc: "가까운 사람의 결을 오늘과 나란히 놓고 봅니다." },
    ],
  },
  en: {
    sectionFeature: "Practices",
    items: [
      { key: "meditation", icon: "◯", label: "Meditation", desc: "Time a quiet breath and log it." },
      { key: "training", icon: "❍", label: "Mind practice", desc: "Write down the scene and one line." },
      { key: "action", icon: "✓", label: "One small step", desc: "Pick one thing to add to today." },
      { key: "card", icon: "▧", label: "Card of the day", desc: "Draw one card to open the day." },
      { key: "together", icon: "❑", label: "Side by side", desc: "Place someone close next to today." },
    ],
  },
} as const;

const copy = MORE_TEXT.ko;

/** 열려 있는 시트. 🔴 목록의 `key` 에서 곧바로 뽑는다 — 줄과 시트 목록을 따로 두면 갈린다. */
type DiaryMoreSheet = (typeof MORE_TEXT.ko.items)[number]["key"];

export default function DiaryMoreView() {
  const [sheet, setSheet] = useState<DiaryMoreSheet | null>(null);
  const close = () => setSheet(null);

  return (
    <>
      <section className={styles.card} aria-labelledby="diary-more-title">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="diary-more-title">
            {copy.sectionFeature}
          </h2>
        </div>
        <ul className={styles.moreList}>
          {copy.items.map((item) => (
            <li key={item.key} className={styles.moreItem}>
              <button
                type="button"
                className={styles.moreRow}
                onClick={() => setSheet(sheet === item.key ? null : item.key)}
                aria-expanded={sheet === item.key}
              >
                <span className={styles.moreIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.moreLabel}>
                  {item.label}
                  <span className={styles.moreDesc}>{item.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <DiaryBackupPanel />

      {sheet === "meditation" ? <DiaryMeditationSheet onClose={close} /> : null}
      {sheet === "training" ? <DiaryMindTrainingSheet onClose={close} /> : null}
      {sheet === "action" ? <DiarySmallActionSheet onClose={close} /> : null}
      {sheet === "card" ? <DiaryTodayCardSheet onClose={close} /> : null}
      {sheet === "together" ? <DiaryTogetherSheet onClose={close} /> : null}
    </>
  );
}
