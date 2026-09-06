"use client";

import DiaryBackupPanel from "./DiaryBackupPanel";
import styles from "../_styles/diary.module.css";

/**
 * 더보기 허브. 매일 쓰지는 않지만 있어야 하는 것들의 입구다.
 *
 * 🔴 여기 있는 다섯 줄은 셸 모달(`js/luck-sync-diary.js`)에 이미 있는 기능의 자리다 —
 * **지우고 옮기는 것이 아니라 이 앱에도 여는 것**이다(사용자 확정, 2026-09-06). 셸 쪽은 그대로 둔다.
 * 🔴 화면은 PR-I-2 에서 시트로 붙는다. 그때까지 줄을 숨기지 않고 「준비 중」으로 남기는 것은,
 * 무엇이 올 자리인지 보이는 편이 빈 화면보다 낫기 때문이다(하단바 탭과 같은 방식).
 *
 * 🔴 「기록 전체 지우기」는 이 목록에 두지 않는다 — 데이터 칸 안에서 2단 확인 뒤에만 열린다.
 */

const MORE_TEXT = {
  ko: {
    sectionFeature: "챙겨 볼 것",
    pending: "준비 중",
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
    pending: "Coming soon",
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

export default function DiaryMoreView() {
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
              {/* 아직 갈 곳이 없으므로 링크가 아니다 — 누를 수 없는 것을 누를 수 있게 보이지 않게 한다. */}
              <span className={styles.moreRow} aria-disabled="true">
                <span className={styles.moreIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.moreLabel}>
                  {item.label}
                  <span className={styles.moreDesc}>{item.desc}</span>
                </span>
                <span className={styles.moreBadge}>{copy.pending}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <DiaryBackupPanel />
    </>
  );
}
