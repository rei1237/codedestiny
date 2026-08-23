"use client";

// 세로 목차. 지금 읽는 장을 aria-current="step" 으로 표시한다.
// 🔴 장 제목은 플랜에서 온다 — 이 파일은 목차 라벨 한 줄도 직접 쓰지 않는다.

import type { ReportChapter } from "../_lib/types";
import styles from "../report.module.css";

type Props = {
  chapters: Array<Pick<ReportChapter, "key" | "order" | "title">>;
  activeKey: string;
  label: string;
};

function ChapterList({ chapters, activeKey }: Pick<Props, "chapters" | "activeKey">) {
  return (
    <ol className={styles.railList}>
      {chapters.map((chapter) => (
        <li key={chapter.key}>
          <a
            href={`#hd-ch-${chapter.key}`}
            className={styles.railLink}
            aria-current={chapter.key === activeKey ? "step" : undefined}
          >
            <span className={styles.railOrder} aria-hidden="true">{String(chapter.order).padStart(2, "0")}</span>
            <span className={styles.railLabel}>{chapter.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function ReportRail({ chapters, activeKey, label }: Props) {
  if (!chapters.length) return null;
  return (
    <>
      {/* 넓은 화면 — 옆에 세워 두고 지금 읽는 장을 계속 비춘다. */}
      <nav className={styles.rail} aria-label={label}>
        <p className={styles.railTitle}>{label}</p>
        <ChapterList chapters={chapters} activeKey={activeKey} />
      </nav>

      {/* 🔴 좁은 화면에도 목차가 있어야 한다. 30페이지짜리 문서에서 이동 수단이 스크롤뿐이면
          읽는 사람이 자기 위치를 잃는다. 레일을 그대로 띄우면 본문을 먹으므로 접어 둔다.
          <details> 라 JS 없이 열리고, 접힌 동안 링크가 탭 순서를 어지럽히지 않는다. */}
      <details className={styles.railMobile}>
        <summary className={styles.railSummary}>{label}</summary>
        <ChapterList chapters={chapters} activeKey={activeKey} />
      </details>
    </>
  );
}
